package middleware

import (
	"net/http"
	"os"
	"strings"
)

// CORSMiddleware returns middleware that allows the frontend to call the API.
func CORSMiddleware() func(http.Handler) http.Handler {
	allowedOrigin := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:5173"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimRight(r.Header.Get("Origin"), "/")
			if origin == allowedOrigin {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
				w.Header().Set("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
