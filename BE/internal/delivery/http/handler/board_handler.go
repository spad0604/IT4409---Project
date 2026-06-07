package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"it4409/internal/domain"
	"it4409/internal/usecase"
)

type BoardHandler struct {
	boardUC *usecase.BoardUsecase
}

func NewBoardHandler(uc *usecase.BoardUsecase) *BoardHandler {
	return &BoardHandler{boardUC: uc}
}

func (h *BoardHandler) RegisterRoutes(r chi.Router) {
	// Các API cho Bảng (Boards)
	r.Post("/projects/{projectID}/boards", h.CreateBoard)
	r.Get("/projects/{projectID}/boards", h.ListBoards)
	r.Get("/boards/{boardID}", h.GetBoard)
	r.Patch("/boards/{boardID}", h.UpdateBoard)
	r.Delete("/boards/{boardID}", h.DeleteBoard)

	// Các API cho Cột (Columns)
	r.Post("/boards/{boardID}/columns", h.AddColumn)
	r.Patch("/boards/{boardID}/columns/{columnID}", h.UpdateColumn)
	r.Delete("/boards/{boardID}/columns/{columnID}", h.DeleteColumn)
	r.Put("/boards/{boardID}/columns/reorder", h.ReorderColumns)
}

func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var req struct {
		Name string `json:"name"`
	}
	if err := parseBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	board, err := h.boardUC.CreateBoard(r.Context(), userID, projectID, req.Name)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, board)
}

func (h *BoardHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	boards, err := h.boardUC.ListBoards(r.Context(), userID, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, boards)
}

func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")

	board, columns, err := h.boardUC.GetBoard(r.Context(), userID, boardID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	// Trả về bảng kèm danh sách cột để Frontend render toàn bộ giao diện Kanban
	writeSuccess(w, http.StatusOK, map[string]any{
		"board":   board,
		"columns": columns,
	})
}

func (h *BoardHandler) UpdateBoard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")

	var patch domain.BoardPatch
	if err := parseBody(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	board, err := h.boardUC.UpdateBoard(r.Context(), userID, boardID, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, board)
}

func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")

	if err := h.boardUC.DeleteBoard(r.Context(), userID, boardID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}

// === API cho Cột ===

func (h *BoardHandler) AddColumn(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")

	var req domain.BoardColumn
	if err := parseBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	col, err := h.boardUC.AddColumn(r.Context(), userID, boardID, &req)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, col)
}

func (h *BoardHandler) UpdateColumn(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")
	columnID := chi.URLParam(r, "columnID")

	var patch domain.BoardColumnPatch
	if err := parseBody(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	col, err := h.boardUC.UpdateColumn(r.Context(), userID, boardID, columnID, &patch)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, col)
}

func (h *BoardHandler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")
	columnID := chi.URLParam(r, "columnID")

	if err := h.boardUC.DeleteColumn(r.Context(), userID, boardID, columnID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}

// ReorderColumns xử lý request kéo thả cột từ Frontend.
func (h *BoardHandler) ReorderColumns(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	boardID := chi.URLParam(r, "boardID")

	var req struct {
		ColumnIDs []string `json:"columnIds"`
	}
	if err := parseBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.boardUC.ReorderColumns(r.Context(), userID, boardID, req.ColumnIDs); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}
