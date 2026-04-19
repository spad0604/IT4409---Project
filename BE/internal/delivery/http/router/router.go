package router

import (
	"encoding/json"
	"net/http"
	"os"

	"it4409/internal/delivery/http/handler"
	"it4409/internal/delivery/http/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"

	// Import docs để đăng ký swagger template
	_ "it4409/docs"
)

type Deps struct {
	AuthHandler    *handler.AuthHandler
	UserHandler    *handler.UserHandler
	ProjectHandler *handler.ProjectHandler
	BoardHandler   *handler.BoardHandler
	LabelHandler   *handler.LabelHandler
	JWTAuth        middleware.JWTAuth
}

func New(deps Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORSMiddleware())

	// Phục vụ Swagger UI — đọc từ file swagger.yaml tĩnh
	r.Get("/swagger/swagger.yaml", func(w http.ResponseWriter, r *http.Request) {
		data, err := os.ReadFile("docs/swagger.yaml")
		if err != nil {
			http.Error(w, "swagger.yaml not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/x-yaml")
		w.Write(data)
	})
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/swagger.yaml"),
	))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":  http.StatusOK,
			"message": "ok",
			"data":    "ok",
		})
	})

	r.Route("/api", func(r chi.Router) {
		// Các route công khai (không cần đăng nhập)
		deps.AuthHandler.RegisterRoutes(r) // /auth/register, /auth/login

		// Các route yêu cầu xác thực JWT
		r.Group(func(r chi.Router) {
			r.Use(deps.JWTAuth.Middleware)

			// Tương thích ngược: giữ /api/me cho FE cũ
			r.Get("/me", deps.AuthHandler.Me)

			// Người A: Auth (protected) + User
			deps.AuthHandler.RegisterProtectedRoutes(r)
			deps.UserHandler.RegisterRoutes(r)

			// Người B: Project + Members + Boards + Labels
			deps.ProjectHandler.RegisterRoutes(r)
			deps.BoardHandler.RegisterRoutes(r)
			deps.LabelHandler.RegisterRoutes(r)
		})
	})

	return r
}
