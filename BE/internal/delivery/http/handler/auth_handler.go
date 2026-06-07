package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"it4409/internal/delivery/http/middleware"
	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	auth *usecase.AuthUsecase
}

func NewAuthHandler(auth *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{auth: auth}
}

// RegisterRoutes registers public (unauthenticated) auth routes.
func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Post("/login", h.Login)
		r.Get("/oauth/{provider}/start", h.OAuthStart)
		r.Get("/oauth/{provider}/callback", h.OAuthCallback)
	})
}

// RegisterProtectedRoutes registers auth routes that require JWT.
func (h *AuthHandler) RegisterProtectedRoutes(r chi.Router) {
	r.Post("/auth/logout", h.Logout)
	r.Post("/auth/change-password", h.ChangePassword)
	r.Post("/auth/refresh", h.RefreshToken)
}

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type changePasswordReq struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type UserDTO struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthData struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

type UserData struct {
	User UserDTO `json:"user"`
}

type AuthEnvelope struct {
	Status  int      `json:"status"`
	Message string   `json:"message"`
	Data    AuthData `json:"data"`
}

type UserEnvelope struct {
	Status  int      `json:"status"`
	Message string   `json:"message"`
	Data    UserData `json:"data"`
}

func toUserDTO(u domain.User) UserDTO {
	return UserDTO{ID: u.ID, Email: u.Email, Name: u.Name, CreatedAt: u.CreatedAt}
}

// Register godoc
// @Summary Register new user
// @Tags auth
// @Accept json
// @Produce json
// @Param body body registerReq true "Register payload"
// @Success 201 {object} AuthEnvelope
// @Failure 400 {object} Envelope
// @Failure 409 {object} Envelope
// @Router /api/auth/register [post]
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	out, err := h.auth.Register(r.Context(), usecase.RegisterInput{Email: req.Email, Password: req.Password, Name: req.Name})
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, AuthEnvelope{
		Status:  http.StatusCreated,
		Message: "success",
		Data:    AuthData{Token: out.Token, User: toUserDTO(out.User)},
	})
}

// Login godoc
// @Summary Login
// @Tags auth
// @Accept json
// @Produce json
// @Param body body loginReq true "Login payload"
// @Success 200 {object} AuthEnvelope
// @Failure 400 {object} Envelope
// @Failure 401 {object} Envelope
// @Router /api/auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	out, err := h.auth.Login(r.Context(), usecase.LoginInput{Email: req.Email, Password: req.Password})
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, AuthEnvelope{
		Status:  http.StatusOK,
		Message: "success",
		Data:    AuthData{Token: out.Token, User: toUserDTO(out.User)},
	})
}

// OAuthStart godoc
// @Summary Start OAuth2 login
// @Description Redirects the browser to Google or GitHub OAuth authorization page.
// @Tags auth
// @Param provider path string true "OAuth provider" Enums(google,github)
// @Success 302 "Redirect to OAuth provider"
// @Failure 400 {object} Envelope
// @Router /api/auth/oauth/{provider}/start [get]
func (h *AuthHandler) OAuthStart(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	redirectURL, err := h.auth.OAuthStartURL(provider)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// OAuthCallback godoc
// @Summary OAuth2 callback
// @Description Handles Google/GitHub callback and redirects back to frontend login with a JWT token in the URL fragment.
// @Tags auth
// @Param provider path string true "OAuth provider" Enums(google,github)
// @Param code query string false "Authorization code"
// @Param state query string false "Signed state"
// @Param error query string false "Provider error"
// @Success 302 "Redirect to frontend"
// @Router /api/auth/oauth/{provider}/callback [get]
func (h *AuthHandler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	if providerErr := r.URL.Query().Get("error"); providerErr != "" {
		http.Redirect(w, r, h.auth.OAuthErrorRedirect(providerErr), http.StatusFound)
		return
	}

	out, err := h.auth.OAuthCallback(
		r.Context(),
		chi.URLParam(r, "provider"),
		r.URL.Query().Get("code"),
		r.URL.Query().Get("state"),
	)
	if err != nil {
		http.Redirect(w, r, h.auth.OAuthErrorRedirect("oauth_failed"), http.StatusFound)
		return
	}

	http.Redirect(w, r, h.auth.OAuthSuccessRedirect(out.Token), http.StatusFound)
}

// Me godoc
// @Summary Get current user
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} UserEnvelope
// @Failure 401 {object} Envelope
// @Router /api/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	user, err := h.auth.Me(r.Context(), userID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, UserEnvelope{
		Status:  http.StatusOK,
		Message: "success",
		Data:    UserData{User: toUserDTO(user)},
	})
}

// Logout godoc
// @Summary Logout (client-side token removal)
// @Tags auth
// @Security BearerAuth
// @Success 200 {object} Envelope
// @Router /api/auth/logout [post]
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, nil)
}

// ChangePassword godoc
// @Summary Change password
// @Tags auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body changePasswordReq true "Password change payload"
// @Success 200 {object} Envelope
// @Failure 400 {object} Envelope
// @Failure 401 {object} Envelope
// @Router /api/auth/change-password [post]
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req changePasswordReq
	if err := parseBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if err := h.auth.ChangePassword(r.Context(), userID, req.OldPassword, req.NewPassword); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}

// RefreshToken godoc
// @Summary Refresh JWT token
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} Envelope
// @Failure 401 {object} Envelope
// @Router /api/auth/refresh [post]
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	token, err := h.auth.RefreshToken(r.Context(), userID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"token": token})
}
