package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"it4409/internal/delivery/http/middleware"
	"it4409/internal/domain"
	"it4409/internal/usecase"
)

type AuthHandler struct {
	auth *usecase.AuthUsecase
}

func NewAuthHandler(auth *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{auth: auth}
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

type ErrorEnvelope struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data"`
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
// @Failure 400 {object} ErrorEnvelope
// @Failure 409 {object} ErrorEnvelope
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
// @Failure 400 {object} ErrorEnvelope
// @Failure 401 {object} ErrorEnvelope
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

// Me godoc
// @Summary Get current user
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} UserEnvelope
// @Failure 401 {object} ErrorEnvelope
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

func writeDomainError(w http.ResponseWriter, err error) {
	switch err {
	case domain.ErrInvalidInput:
		writeError(w, http.StatusBadRequest, err.Error())
	case domain.ErrConflict:
		writeError(w, http.StatusConflict, err.Error())
	case domain.ErrUnauthorized:
		writeError(w, http.StatusUnauthorized, err.Error())
	case domain.ErrNotFound:
		writeError(w, http.StatusNotFound, err.Error())
	default:
		log.Printf("internal error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, ErrorEnvelope{Status: status, Message: message, Data: nil})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
