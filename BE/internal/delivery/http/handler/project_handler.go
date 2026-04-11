package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"it4409/internal/domain"
	"it4409/internal/usecase"
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

func getUserID(r *http.Request) string {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		// Mock hỗ trợ cho Tester
		return r.Header.Get("X-User-ID")
	}
	return userID
}

func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var proj domain.Project
	if err := json.NewDecoder(r.Body).Decode(&proj); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	created, err := h.projectUC.CreateProject(r.Context(), userID, &proj)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projects, err := h.projectUC.ListProjects(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(projects)
}

func (h *ProjectHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "id")

	proj, err := h.projectUC.GetProject(r.Context(), userID, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(proj)
}

func (h *ProjectHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "id")

	var patch domain.ProjectPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	proj, err := h.projectUC.UpdateProject(r.Context(), userID, projectID, &patch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(proj)
}

func (h *ProjectHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "id")

	if err := h.projectUC.DeleteProject(r.Context(), userID, projectID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ProjectHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	projectID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	member := &domain.ProjectMember{
		ProjectID: projectID,
		UserID:    req.UserID,
		Role:      req.Role,
	}

	if err := h.projectUC.AddMember(r.Context(), adminID, member); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *ProjectHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "id")

	members, err := h.projectUC.GetMembers(r.Context(), userID, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

func (h *ProjectHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	projectID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userID")

	if err := h.projectUC.RemoveMember(r.Context(), adminID, projectID, targetUserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ProjectHandler) ChangeRole(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)
	projectID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userID")

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.projectUC.ChangeRole(r.Context(), adminID, projectID, targetUserID, req.Role); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
