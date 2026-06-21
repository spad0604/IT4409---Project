package handler

import (
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"it4409/internal/infra/filestore"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type UserHandler struct {
	userUC *usecase.UserUsecase
	files  *filestore.FileStore
}

func NewUserHandler(uc *usecase.UserUsecase, files *filestore.FileStore) *UserHandler {
	return &UserHandler{userUC: uc, files: files}
}

// RegisterRoutes registers user-related routes under the /users prefix.
func (h *UserHandler) RegisterRoutes(r chi.Router) {
	r.Route("/users", func(r chi.Router) {
		r.Get("/me", h.GetProfile)
		r.Patch("/me", h.UpdateProfile)
		r.Post("/me/avatar", h.UploadAvatar)
		r.Get("/me/preferences", h.GetPreferences)
		r.Put("/me/preferences", h.UpdatePreferences)
		r.Get("/", h.SearchUsers)
		r.Get("/{userID}", h.GetUser)
	})
}

func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if h.files == nil {
		writeError(w, http.StatusInternalServerError, "file storage unavailable")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "ảnh quá lớn (tối đa 5MB)")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "thiếu tệp ảnh")
		return
	}
	defer file.Close()
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = mime.TypeByExtension(filepath.Ext(header.Filename))
	}
	if !strings.HasPrefix(strings.ToLower(mimeType), "image/") {
		writeError(w, http.StatusBadRequest, "chỉ hỗ trợ tệp ảnh")
		return
	}
	path, err := h.files.Save(header.Filename, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "không thể lưu ảnh")
		return
	}
	avatarURL := "/uploads/" + path
	user, err := h.userUC.UpdateProfile(r.Context(), userID, usecase.UpdateProfileInput{AvatarURL: &avatarURL})
	if err != nil {
		_ = h.files.Remove(path)
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, UserProfileDTO{ID: user.ID, Email: user.Email, Name: user.Name, AvatarURL: user.AvatarURL, UpdatedAt: user.UpdatedAt, CreatedAt: user.CreatedAt})
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

type UserPreferencesDTO struct {
	Language           string `json:"language"`
	CompactMode        bool   `json:"compact_mode"`
	EmailNotifications bool   `json:"email_notifications"`
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

func (h *UserHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pref, err := h.userUC.GetPreferences(r.Context(), userID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, UserPreferencesDTO{Language: pref.Language, CompactMode: pref.CompactMode, EmailNotifications: pref.EmailNotifications})
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input usecase.UpdatePreferencesInput
	if err := parseBody(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	pref, err := h.userUC.UpdatePreferences(r.Context(), userID, input)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, UserPreferencesDTO{Language: pref.Language, CompactMode: pref.CompactMode, EmailNotifications: pref.EmailNotifications})
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
