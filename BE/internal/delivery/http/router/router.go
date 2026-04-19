package router

import (
	"encoding/json"
	"net/http"

	"it4409/internal/delivery/http/handler"
	"it4409/internal/delivery/http/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"
)

type Deps struct {
	AuthHandler    *handler.AuthHandler
	UserHandler    *handler.UserHandler
	ProjectHandler *handler.ProjectHandler
	JWTAuth        middleware.JWTAuth
}

func New(deps Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORSMiddleware())

	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
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

	// Public routes (no auth required)
	r.Route("/api", func(r chi.Router) {
		deps.AuthHandler.RegisterRoutes(r) // /auth/register, /auth/login
	})

	// Protected routes (JWT required)
	r.Route("/api", func(r chi.Router) {
		r.Use(deps.JWTAuth.Middleware)

		// ★ Backward compatible: keep /api/me for existing FE
		r.Get("/me", deps.AuthHandler.Me)

		// Người A: Auth (protected) + User
		deps.AuthHandler.RegisterProtectedRoutes(r) // /auth/logout, /auth/change-password, /auth/refresh
		deps.UserHandler.RegisterRoutes(r)           // /users/me, /users/{userID}, /users?search=

		// Người B: Project + Members
		deps.ProjectHandler.RegisterRoutes(r) // /projects/...
	})

	return r
}
