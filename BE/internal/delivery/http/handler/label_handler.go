package handler

import (
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
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var label domain.Label
	if err := parseBody(r, &label); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	label.ProjectID = projectID

	created, err := h.labelUC.CreateLabel(r.Context(), userID, &label)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, created)
}

func (h *LabelHandler) ListLabels(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	labels, err := h.labelUC.ListLabels(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, labels)
}

func (h *LabelHandler) UpdateLabel(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	labelID := chi.URLParam(r, "labelID")

	var patch domain.LabelPatch
	if err := parseBody(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	label, err := h.labelUC.UpdateLabel(r.Context(), userID, labelID, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, label)
}

func (h *LabelHandler) DeleteLabel(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	labelID := chi.URLParam(r, "labelID")

	if err := h.labelUC.DeleteLabel(r.Context(), userID, labelID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}

// AttachToIssue gắn nhãn vào công việc theo issue key (VD: PRJ-1).
func (h *LabelHandler) AttachToIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	var req struct {
		LabelID string `json:"labelId"`
	}
	if err := parseBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.labelUC.AttachToIssue(r.Context(), userID, issueKey, req.LabelID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusCreated, nil)
}

func (h *LabelHandler) DetachFromIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")
	labelID := chi.URLParam(r, "labelID")

	if err := h.labelUC.DetachFromIssue(r.Context(), userID, issueKey, labelID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}
