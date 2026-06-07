package handler

import (
	"encoding/json"
	"net/http"

	"it4409/internal/delivery/http/middleware"
	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type ProjectHandler struct {
	projectUC *usecase.ProjectUsecase
}

func NewProjectHandler(uc *usecase.ProjectUsecase) *ProjectHandler {
	return &ProjectHandler{projectUC: uc}
}

func (h *ProjectHandler) RegisterRoutes(r chi.Router) {
	r.Route("/projects", func(r chi.Router) {
		r.Post("/", h.CreateProject)
		r.Get("/", h.ListProjects)
		r.Get("/{id}", h.GetProject)
		r.Patch("/{id}", h.UpdateProject)
		r.Delete("/{id}", h.DeleteProject)

		// Các API dành cho Thành viên (Members)
		r.Get("/{id}/members", h.GetMembers)
		r.Post("/{id}/members", h.AddMember)
		r.Delete("/{id}/members/{userID}", h.RemoveMember)
		r.Put("/{id}/members/{userID}", h.ChangeRole)
	})
}

// getUserID lấy userID từ JWT context (do middleware set vào).
// Nếu không có JWT, fallback sang header X-User-ID (dùng cho test thủ công).
func getUserID(r *http.Request) string {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		return r.Header.Get("X-User-ID")
	}
	return userID
}

func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var proj domain.Project
	if err := json.NewDecoder(r.Body).Decode(&proj); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	created, err := h.projectUC.CreateProject(r.Context(), userID, &proj)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, created)
}

func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projects, err := h.projectUC.ListProjects(r.Context(), userID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, projects)
}

func (h *ProjectHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")

	proj, err := h.projectUC.GetProject(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, proj)
}

func (h *ProjectHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")

	var patch domain.ProjectPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	proj, err := h.projectUC.UpdateProject(r.Context(), userID, projectID, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, proj)
}

func (h *ProjectHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")

	if err := h.projectUC.DeleteProject(r.Context(), userID, projectID); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}

func (h *ProjectHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	if adminID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	member := &domain.ProjectMember{
		ProjectID: projectID,
		UserID:    req.UserID,
		Role:      req.Role,
	}

	if err := h.projectUC.AddMember(r.Context(), adminID, member); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, nil)
}

func (h *ProjectHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")

	members, err := h.projectUC.GetMembers(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, members)
}

func (h *ProjectHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	if adminID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userID")

	if err := h.projectUC.RemoveMember(r.Context(), adminID, projectID, targetUserID); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}

func (h *ProjectHandler) ChangeRole(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	if adminID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	projectID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userID")

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.projectUC.ChangeRole(r.Context(), adminID, projectID, targetUserID, req.Role); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}
