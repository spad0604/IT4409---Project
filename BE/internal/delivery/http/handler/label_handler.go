package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"it4409/internal/domain"
	"it4409/internal/usecase"
)

type LabelHandler struct {
	labelUC *usecase.LabelUsecase
}

func NewLabelHandler(uc *usecase.LabelUsecase) *LabelHandler {
	return &LabelHandler{labelUC: uc}
}

func (h *LabelHandler) RegisterRoutes(r chi.Router) {
	// Các API cho Nhãn (Labels)
	r.Post("/projects/{projectID}/labels", h.CreateLabel)
	r.Get("/projects/{projectID}/labels", h.ListLabels)
	r.Patch("/labels/{labelID}", h.UpdateLabel)
	r.Delete("/labels/{labelID}", h.DeleteLabel)

	// Gắn/gỡ nhãn vào công việc
	r.Post("/issues/{issueKey}/labels", h.AttachToIssue)
	r.Delete("/issues/{issueKey}/labels/{labelID}", h.DetachFromIssue)
}

func (h *LabelHandler) CreateLabel(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var label domain.Label
	if err := json.NewDecoder(r.Body).Decode(&label); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	label.ProjectID = projectID

	created, err := h.labelUC.CreateLabel(r.Context(), userID, &label)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (h *LabelHandler) ListLabels(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "projectID")

	labels, err := h.labelUC.ListLabels(r.Context(), userID, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(labels)
}

func (h *LabelHandler) UpdateLabel(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	labelID := chi.URLParam(r, "labelID")

	var patch domain.LabelPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	label, err := h.labelUC.UpdateLabel(r.Context(), userID, labelID, &patch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(label)
}

func (h *LabelHandler) DeleteLabel(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	labelID := chi.URLParam(r, "labelID")

	if err := h.labelUC.DeleteLabel(r.Context(), userID, labelID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AttachToIssue gắn nhãn vào công việc.
// Lưu ý: issueKey ở đây là issue ID (do Người A quyết định format).
func (h *LabelHandler) AttachToIssue(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	issueKey := chi.URLParam(r, "issueKey")

	var req struct {
		LabelID string `json:"labelId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.labelUC.AttachToIssue(r.Context(), userID, issueKey, req.LabelID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *LabelHandler) DetachFromIssue(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	issueKey := chi.URLParam(r, "issueKey")
	labelID := chi.URLParam(r, "labelID")

	if err := h.labelUC.DetachFromIssue(r.Context(), userID, issueKey, labelID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
