package handler

import (
	"net/http"
	"time"

	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type SprintHandler struct {
	sprintUC *usecase.SprintUsecase
}

func NewSprintHandler(uc *usecase.SprintUsecase) *SprintHandler {
	return &SprintHandler{sprintUC: uc}
}

// RegisterRoutes registers sprint-related routes.
func (h *SprintHandler) RegisterRoutes(r chi.Router) {
	r.Post("/projects/{projectID}/sprints", h.CreateSprint)
	r.Get("/projects/{projectID}/sprints", h.ListSprints)
	r.Get("/projects/{projectID}/backlog", h.GetBacklog)
	r.Get("/sprints/{sprintID}", h.GetSprint)
	r.Patch("/sprints/{sprintID}", h.UpdateSprint)
	r.Post("/sprints/{sprintID}/start", h.StartSprint)
	r.Post("/sprints/{sprintID}/complete", h.CompleteSprint)
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

type SprintDTO struct {
	ID        string     `json:"id"`
	ProjectID string     `json:"projectId"`
	Name      string     `json:"name"`
	Goal      string     `json:"goal"`
	Status    string     `json:"status"`
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"`
	CreatedBy string     `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func toSprintDTO(s *domain.Sprint) SprintDTO {
	return SprintDTO{
		ID: s.ID, ProjectID: s.ProjectID, Name: s.Name, Goal: s.Goal,
		Status: s.Status, StartDate: s.StartDate, EndDate: s.EndDate,
		CreatedBy: s.CreatedBy, CreatedAt: s.CreatedAt, UpdatedAt: s.UpdatedAt,
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// CreateSprint godoc
// @Summary Create a new sprint
// @Tags sprints
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param projectID path string true "Project ID"
// @Param body body usecase.CreateSprintInput true "Sprint data"
// @Success 201 {object} Envelope
// @Failure 400,403 {object} Envelope
// @Router /api/projects/{projectID}/sprints [post]
func (h *SprintHandler) CreateSprint(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}

	var input usecase.CreateSprintInput
	if err := parseBody(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	sprint, err := h.sprintUC.CreateSprint(r.Context(), userID, projectID, input)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, toSprintDTO(sprint))
}

// ListSprints godoc
// @Summary List sprints in a project
// @Tags sprints
// @Security BearerAuth
// @Produce json
// @Param projectID path string true "Project ID"
// @Success 200 {object} Envelope
// @Router /api/projects/{projectID}/sprints [get]
func (h *SprintHandler) ListSprints(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}

	sprints, err := h.sprintUC.ListSprints(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]SprintDTO, len(sprints))
	for i, s := range sprints {
		dtos[i] = toSprintDTO(s)
	}

	writeSuccess(w, http.StatusOK, dtos)
}

// GetSprint godoc
// @Summary Get sprint details
// @Tags sprints
// @Security BearerAuth
// @Produce json
// @Param sprintID path string true "Sprint ID"
// @Success 200 {object} Envelope
// @Failure 404 {object} Envelope
// @Router /api/sprints/{sprintID} [get]
func (h *SprintHandler) GetSprint(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	sprintID := chi.URLParam(r, "sprintID")
	if _, ok := parseUUID(w, sprintID); !ok {
		return
	}

	sprint, err := h.sprintUC.GetSprint(r.Context(), userID, sprintID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toSprintDTO(sprint))
}

// UpdateSprint godoc
// @Summary Update a sprint (partial)
// @Tags sprints
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param sprintID path string true "Sprint ID"
// @Param body body domain.SprintPatch true "Fields to update"
// @Success 200 {object} Envelope
// @Router /api/sprints/{sprintID} [patch]
func (h *SprintHandler) UpdateSprint(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	sprintID := chi.URLParam(r, "sprintID")
	if _, ok := parseUUID(w, sprintID); !ok {
		return
	}

	var patch domain.SprintPatch
	if err := parseBody(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	sprint, err := h.sprintUC.UpdateSprint(r.Context(), userID, sprintID, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toSprintDTO(sprint))
}

// StartSprint godoc
// @Summary Start a sprint (planning → active)
// @Tags sprints
// @Security BearerAuth
// @Produce json
// @Param sprintID path string true "Sprint ID"
// @Success 200 {object} Envelope
// @Failure 409 {object} Envelope "Another sprint is already active"
// @Router /api/sprints/{sprintID}/start [post]
func (h *SprintHandler) StartSprint(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	sprintID := chi.URLParam(r, "sprintID")
	if _, ok := parseUUID(w, sprintID); !ok {
		return
	}

	sprint, err := h.sprintUC.StartSprint(r.Context(), userID, sprintID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toSprintDTO(sprint))
}

// CompleteSprint godoc
// @Summary Complete a sprint (active → completed), move undone issues to backlog
// @Tags sprints
// @Security BearerAuth
// @Produce json
// @Param sprintID path string true "Sprint ID"
// @Success 200 {object} Envelope
// @Router /api/sprints/{sprintID}/complete [post]
func (h *SprintHandler) CompleteSprint(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	sprintID := chi.URLParam(r, "sprintID")
	if _, ok := parseUUID(w, sprintID); !ok {
		return
	}

	sprint, err := h.sprintUC.CompleteSprint(r.Context(), userID, sprintID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toSprintDTO(sprint))
}

// GetBacklog godoc
// @Summary Get backlog issues (sprint_id IS NULL)
// @Tags sprints
// @Security BearerAuth
// @Produce json
// @Param projectID path string true "Project ID"
// @Success 200 {object} Envelope
// @Router /api/projects/{projectID}/backlog [get]
func (h *SprintHandler) GetBacklog(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}

	issues, err := h.sprintUC.GetBacklog(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]IssueDTO, len(issues))
	for i, issue := range issues {
		dtos[i] = toIssueDTO(issue)
	}

	writeSuccess(w, http.StatusOK, dtos)
}
