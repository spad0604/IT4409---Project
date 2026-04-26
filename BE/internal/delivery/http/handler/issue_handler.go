package handler

import (
	"net/http"
	"time"

	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type IssueHandler struct {
	issueUC *usecase.IssueUsecase
}

func NewIssueHandler(uc *usecase.IssueUsecase) *IssueHandler {
	return &IssueHandler{issueUC: uc}
}

// RegisterRoutes registers issue-related routes.
func (h *IssueHandler) RegisterRoutes(r chi.Router) {
	// Scoped under /projects/{projectID}
	r.Post("/projects/{projectID}/issues", h.CreateIssue)
	r.Get("/projects/{projectID}/issues", h.ListIssues)

	// Scoped under /issues/{issueKey}
	r.Get("/issues/{issueKey}", h.GetIssue)
	r.Patch("/issues/{issueKey}", h.UpdateIssue)
	r.Delete("/issues/{issueKey}", h.DeleteIssue)
	r.Put("/issues/{issueKey}/status", h.ChangeStatus)
	r.Put("/issues/{issueKey}/assign", h.AssignIssue)
	r.Get("/issues/{issueKey}/subtasks", h.ListSubtasks)
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

type IssueDTO struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	IssueNumber int        `json:"issueNumber"`
	Key         string     `json:"key"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AssigneeID  *string    `json:"assigneeId"`
	ReporterID  string     `json:"reporterId"`
	ParentID    *string    `json:"parentId"`
	SprintID    *string    `json:"sprintId"`
	SortOrder   float64    `json:"sortOrder"`
	DueDate     *time.Time `json:"dueDate"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func toIssueDTO(i *domain.Issue) IssueDTO {
	return IssueDTO{
		ID: i.ID, ProjectID: i.ProjectID, IssueNumber: i.IssueNumber, Key: i.Key,
		Type: i.Type, Status: i.Status, Priority: i.Priority,
		Title: i.Title, Description: i.Description,
		AssigneeID: i.AssigneeID, ReporterID: i.ReporterID,
		ParentID: i.ParentID, SprintID: i.SprintID,
		SortOrder: i.SortOrder, DueDate: i.DueDate,
		CreatedAt: i.CreatedAt, UpdatedAt: i.UpdatedAt,
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// CreateIssue godoc
// @Summary Create a new issue in a project
// @Tags issues
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param projectID path string true "Project ID"
// @Param body body usecase.CreateIssueInput true "Issue data"
// @Success 201 {object} Envelope
// @Failure 400 {object} Envelope
// @Failure 403 {object} Envelope
// @Router /api/projects/{projectID}/issues [post]
func (h *IssueHandler) CreateIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}

	var input usecase.CreateIssueInput
	if err := parseBody(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	issue, err := h.issueUC.CreateIssue(r.Context(), userID, projectID, input)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, toIssueDTO(issue))
}

// ListIssues godoc
// @Summary List issues in a project with filters
// @Tags issues
// @Security BearerAuth
// @Produce json
// @Param projectID path string true "Project ID"
// @Param status query string false "Filter by status"
// @Param type query string false "Filter by type"
// @Param priority query string false "Filter by priority"
// @Param assignee query string false "Filter by assignee UUID or 'me'"
// @Param sprint query string false "Filter by sprint UUID or 'backlog'"
// @Param search query string false "Search by title"
// @Param page query int false "Page number (0-based)"
// @Param per_page query int false "Items per page"
// @Param sort query string false "Sort field"
// @Param order query string false "Sort order (asc/desc)"
// @Success 200 {object} Envelope
// @Router /api/projects/{projectID}/issues [get]
func (h *IssueHandler) ListIssues(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	if _, ok := parseUUID(w, projectID); !ok {
		return
	}

	q := r.URL.Query()
	filter := domain.IssueFilter{
		Status:     q.Get("status"),
		Type:       q.Get("type"),
		Priority:   q.Get("priority"),
		AssigneeID: q.Get("assignee"),
		SprintID:   q.Get("sprint"),
		ParentID:   q.Get("parent"),
		Search:     q.Get("search"),
		Sort:       q.Get("sort"),
		Order:      q.Get("order"),
	}

	// Pagination: dùng parsePagination cho limit/offset, rồi chuyển sang page/perPage
	limit, offset := parsePagination(r)
	filter.PerPage = limit
	if limit > 0 {
		filter.Page = offset / limit
	}

	issues, total, err := h.issueUC.ListIssues(r.Context(), userID, projectID, filter)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]IssueDTO, len(issues))
	for i, issue := range issues {
		dtos[i] = toIssueDTO(issue)
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"items":   dtos,
		"total":   total,
		"page":    filter.Page,
		"perPage": filter.PerPage,
	})
}

// GetIssue godoc
// @Summary Get issue details by key
// @Tags issues
// @Security BearerAuth
// @Produce json
// @Param issueKey path string true "Issue key (e.g. MYPRJ-42)"
// @Success 200 {object} Envelope
// @Failure 404 {object} Envelope
// @Router /api/issues/{issueKey} [get]
func (h *IssueHandler) GetIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	issue, err := h.issueUC.GetIssue(r.Context(), userID, issueKey)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toIssueDTO(issue))
}

// UpdateIssue godoc
// @Summary Update an issue (partial)
// @Tags issues
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param issueKey path string true "Issue key"
// @Param body body domain.IssuePatch true "Fields to update"
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey} [patch]
func (h *IssueHandler) UpdateIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	var patch domain.IssuePatch
	if err := parseBody(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	issue, err := h.issueUC.UpdateIssue(r.Context(), userID, issueKey, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toIssueDTO(issue))
}

// DeleteIssue godoc
// @Summary Soft delete an issue
// @Tags issues
// @Security BearerAuth
// @Param issueKey path string true "Issue key"
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey} [delete]
func (h *IssueHandler) DeleteIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	if err := h.issueUC.DeleteIssue(r.Context(), userID, issueKey); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}

// ChangeStatus godoc
// @Summary Change issue status
// @Tags issues
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param issueKey path string true "Issue key"
// @Param body body object true "{ status: string }"
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey}/status [put]
func (h *IssueHandler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	var body struct {
		Status string `json:"status"`
	}
	if err := parseBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	issue, err := h.issueUC.ChangeStatus(r.Context(), userID, issueKey, body.Status)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toIssueDTO(issue))
}

// AssignIssue godoc
// @Summary Assign or unassign a user to an issue
// @Tags issues
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param issueKey path string true "Issue key"
// @Param body body object true "{ assigneeId: string|null }"
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey}/assign [put]
func (h *IssueHandler) AssignIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	var body struct {
		AssigneeID *string `json:"assigneeId"`
	}
	if err := parseBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	issue, err := h.issueUC.AssignIssue(r.Context(), userID, issueKey, body.AssigneeID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toIssueDTO(issue))
}

// ListSubtasks godoc
// @Summary List subtasks of an issue
// @Tags issues
// @Security BearerAuth
// @Produce json
// @Param issueKey path string true "Parent issue key"
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey}/subtasks [get]
func (h *IssueHandler) ListSubtasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	issues, err := h.issueUC.ListSubtasks(r.Context(), userID, issueKey)
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
