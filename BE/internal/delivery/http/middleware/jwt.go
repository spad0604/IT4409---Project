package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/pkg/jwtutil"
)

type ctxKeyUserID struct{}

type JWTAuth struct {
	JWT jwtutil.Service
}

func (m JWTAuth) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		if authz == "" {
			writeJSONError(w, http.StatusUnauthorized, domain.ErrUnauthorized.Error())
			return
		}

		tokenString := authz
		if parts := strings.SplitN(authz, " ", 2); len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			tokenString = strings.TrimSpace(parts[1])
		}
		if tokenString == "" {
			writeJSONError(w, http.StatusUnauthorized, domain.ErrUnauthorized.Error())
			return
		}

		claims, err := m.JWT.Parse(tokenString)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, domain.ErrUnauthorized.Error())
			return
		}

		ctx := context.WithValue(r.Context(), ctxKeyUserID{}, claims.Subject)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(ctxKeyUserID{}).(string)
	return id, ok
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":  status,
		"message": message,
		"data":    nil,
	})
}
