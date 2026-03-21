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
	AuthHandler *handler.AuthHandler
	JWTAuth     middleware.JWTAuth
}

func New(deps Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

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

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", deps.AuthHandler.Register)
		r.Post("/login", deps.AuthHandler.Login)
	})

	r.Group(func(r chi.Router) {
		r.Use(deps.JWTAuth.Middleware)
		r.Get("/api/me", deps.AuthHandler.Me)
	})

	return r
}
