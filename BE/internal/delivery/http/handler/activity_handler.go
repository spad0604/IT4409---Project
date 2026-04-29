package handler

import (
	"net/http"
	"time"

	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type ActivityHandler struct {
	activityUC *usecase.ActivityUsecase
}

func NewActivityHandler(uc *usecase.ActivityUsecase) *ActivityHandler {
	return &ActivityHandler{activityUC: uc}
}

// RegisterRoutes registers activity-related routes.
func (h *ActivityHandler) RegisterRoutes(r chi.Router) {
	r.Get("/issues/{issueKey}/activity", h.GetIssueActivity)
	r.Get("/projects/{projectID}/activity", h.GetProjectActivity)
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

type ActivityDTO struct {
	ID        string    `json:"id"`
	IssueID   string    `json:"issueId"`
	UserID    string    `json:"userId"`
	Action    string    `json:"action"`
	Field     string    `json:"field,omitempty"`
	OldValue  string    `json:"oldValue,omitempty"`
	NewValue  string    `json:"newValue,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

func toActivityDTO(a *domain.Activity) ActivityDTO {
	return ActivityDTO{
		ID: a.ID, IssueID: a.IssueID, UserID: a.UserID,
		Action: a.Action, Field: a.Field,
		OldValue: a.OldValue, NewValue: a.NewValue,
		CreatedAt: a.CreatedAt,
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// GetIssueActivity godoc
// @Summary Get activity log for an issue
// @Tags activity
// @Security BearerAuth
// @Produce json
// @Param issueKey path string true "Issue key (e.g. MYPRJ-42)"
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey}/activity [get]
func (h *ActivityHandler) GetIssueActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")
	limit, offset := parsePagination(r)

	activities, total, err := h.activityUC.GetIssueActivity(r.Context(), userID, issueKey, limit, offset)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]ActivityDTO, len(activities))
	for i, a := range activities {
		dtos[i] = toActivityDTO(a)
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"items":   dtos,
		"total":   total,
		"page":    offset/limit + 1,
		"perPage": limit,
	})
}

// GetProjectActivity godoc
// @Summary Get activity log for a project
// @Tags activity
// @Security BearerAuth
// @Produce json
// @Param projectID path string true "Project ID"
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} Envelope
// @Router /api/projects/{projectID}/activity [get]
func (h *ActivityHandler) GetProjectActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}
	limit, offset := parsePagination(r)

	activities, total, err := h.activityUC.GetProjectActivity(r.Context(), userID, projectID, limit, offset)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]ActivityDTO, len(activities))
	for i, a := range activities {
		dtos[i] = toActivityDTO(a)
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"items":   dtos,
		"total":   total,
		"page":    offset/limit + 1,
		"perPage": limit,
	})
}
