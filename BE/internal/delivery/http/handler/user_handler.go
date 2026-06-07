package handler

import (
	"net/http"
	"time"

	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type UserHandler struct {
	userUC *usecase.UserUsecase
}

func NewUserHandler(uc *usecase.UserUsecase) *UserHandler {
	return &UserHandler{userUC: uc}
}

// RegisterRoutes registers user-related routes under the /users prefix.
func (h *UserHandler) RegisterRoutes(r chi.Router) {
	r.Route("/users", func(r chi.Router) {
		r.Get("/me", h.GetProfile)
		r.Patch("/me", h.UpdateProfile)
		r.Get("/", h.SearchUsers)
		r.Get("/{userID}", h.GetUser)
	})
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

type UserProfileDTO struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedAt time.Time `json:"created_at"`
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// GetProfile godoc
// @Summary Get current user profile
// @Tags users
// @Security BearerAuth
// @Produce json
// @Success 200 {object} Envelope
// @Failure 401 {object} Envelope
// @Router /api/users/me [get]
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	user, err := h.userUC.GetProfile(r.Context(), userID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, UserProfileDTO{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
		UpdatedAt: user.UpdatedAt,
		CreatedAt: user.CreatedAt,
	})
}

// UpdateProfile godoc
// @Summary Update current user profile
// @Tags users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body usecase.UpdateProfileInput true "Update payload"
// @Success 200 {object} Envelope
// @Failure 400 {object} Envelope
// @Failure 401 {object} Envelope
// @Router /api/users/me [patch]
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input usecase.UpdateProfileInput
	if err := parseBody(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	user, err := h.userUC.UpdateProfile(r.Context(), userID, input)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, UserProfileDTO{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
		UpdatedAt: user.UpdatedAt,
		CreatedAt: user.CreatedAt,
	})
}

// GetUser godoc
// @Summary Get a user by ID
// @Tags users
// @Security BearerAuth
// @Produce json
// @Param userID path string true "User ID"
// @Success 200 {object} Envelope
// @Failure 400 {object} Envelope
// @Failure 404 {object} Envelope
// @Router /api/users/{userID} [get]
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	targetID := chi.URLParam(r, "userID")
	if _, ok := parseUUID(w, targetID); !ok {
		return
	}

	user, err := h.userUC.GetUser(r.Context(), targetID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, UserProfileDTO{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
		UpdatedAt: user.UpdatedAt,
		CreatedAt: user.CreatedAt,
	})
}

// SearchUsers godoc
// @Summary Search users by name or email
// @Tags users
// @Security BearerAuth
// @Produce json
// @Param search query string true "Search keyword"
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} Envelope
// @Router /api/users [get]
func (h *UserHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("search")
	limit, offset := parsePagination(r)

	users, err := h.userUC.SearchUsers(r.Context(), keyword, limit, offset)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]UserProfileDTO, len(users))
	for i, u := range users {
		dtos[i] = UserProfileDTO{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			AvatarURL: u.AvatarURL,
			UpdatedAt: u.UpdatedAt,
			CreatedAt: u.CreatedAt,
		}
	}

	writeSuccess(w, http.StatusOK, dtos)
}
