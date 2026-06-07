package handler

import (
	"net/http"
	"time"

	"it4409/internal/domain"
	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type CommentHandler struct {
	commentUC *usecase.CommentUsecase
}

func NewCommentHandler(uc *usecase.CommentUsecase) *CommentHandler {
	return &CommentHandler{commentUC: uc}
}

// RegisterRoutes registers comment-related routes.
func (h *CommentHandler) RegisterRoutes(r chi.Router) {
	r.Post("/issues/{issueKey}/comments", h.AddComment)
	r.Get("/issues/{issueKey}/comments", h.ListComments)
	r.Patch("/comments/{commentID}", h.EditComment)
	r.Delete("/comments/{commentID}", h.DeleteComment)
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

type CommentDTO struct {
	ID        string    `json:"id"`
	IssueID   string    `json:"issueId"`
	UserID    string    `json:"userId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func toCommentDTO(c *domain.Comment) CommentDTO {
	return CommentDTO{
		ID: c.ID, IssueID: c.IssueID, UserID: c.UserID,
		Content: c.Content, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// AddComment godoc
// @Summary Add a comment to an issue
// @Tags comments
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param issueKey path string true "Issue key (e.g. MYPRJ-42)"
// @Success 201 {object} Envelope
// @Router /api/issues/{issueKey}/comments [post]
func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	var body struct {
		Content string `json:"content"`
	}
	if err := parseBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	comment, err := h.commentUC.AddComment(r.Context(), userID, issueKey, body.Content)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, toCommentDTO(comment))
}

// ListComments godoc
// @Summary List comments of an issue
// @Tags comments
// @Security BearerAuth
// @Produce json
// @Param issueKey path string true "Issue key"
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} Envelope
// @Router /api/issues/{issueKey}/comments [get]
func (h *CommentHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")
	limit, offset := parsePagination(r)

	comments, total, err := h.commentUC.ListComments(r.Context(), userID, issueKey, limit, offset)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]CommentDTO, len(comments))
	for i, c := range comments {
		dtos[i] = toCommentDTO(c)
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"items":   dtos,
		"total":   total,
		"page":    offset/limit + 1,
		"perPage": limit,
	})
}

// EditComment godoc
// @Summary Edit a comment (author only)
// @Tags comments
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param commentID path string true "Comment ID"
// @Success 200 {object} Envelope
// @Router /api/comments/{commentID} [patch]
func (h *CommentHandler) EditComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	commentID := chi.URLParam(r, "commentID")
	if _, ok := parseUUID(w, commentID); !ok {
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := parseBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	comment, err := h.commentUC.EditComment(r.Context(), userID, commentID, body.Content)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, toCommentDTO(comment))
}

// DeleteComment godoc
// @Summary Delete a comment (author or project admin)
// @Tags comments
// @Security BearerAuth
// @Param commentID path string true "Comment ID"
// @Success 200 {object} Envelope
// @Router /api/comments/{commentID} [delete]
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	commentID := chi.URLParam(r, "commentID")
	if _, ok := parseUUID(w, commentID); !ok {
		return
	}

	if err := h.commentUC.DeleteComment(r.Context(), userID, commentID); err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, nil)
}
