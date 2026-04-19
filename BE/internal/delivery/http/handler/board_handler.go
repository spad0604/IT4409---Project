package handler

import (
	"encoding/json"
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
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	board, err := h.boardUC.CreateBoard(r.Context(), userID, projectID, req.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(board)
}

func (h *BoardHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := chi.URLParam(r, "projectID")

	boards, err := h.boardUC.ListBoards(r.Context(), userID, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(boards)
}

func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")

	board, columns, err := h.boardUC.GetBoard(r.Context(), userID, boardID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Trả về bảng kèm danh sách cột để Frontend render toàn bộ giao diện Kanban
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"board":   board,
		"columns": columns,
	})
}

func (h *BoardHandler) UpdateBoard(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")

	var patch domain.BoardPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	board, err := h.boardUC.UpdateBoard(r.Context(), userID, boardID, &patch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(board)
}

func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")

	if err := h.boardUC.DeleteBoard(r.Context(), userID, boardID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// === API cho Cột ===

func (h *BoardHandler) AddColumn(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")

	var req domain.BoardColumn
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	col, err := h.boardUC.AddColumn(r.Context(), userID, boardID, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(col)
}

func (h *BoardHandler) UpdateColumn(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")
	columnID := chi.URLParam(r, "columnID")

	var patch domain.BoardColumnPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	col, err := h.boardUC.UpdateColumn(r.Context(), userID, boardID, columnID, &patch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(col)
}

func (h *BoardHandler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")
	columnID := chi.URLParam(r, "columnID")

	if err := h.boardUC.DeleteColumn(r.Context(), userID, boardID, columnID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ReorderColumns xử lý request kéo thả cột từ Frontend.
func (h *BoardHandler) ReorderColumns(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	boardID := chi.URLParam(r, "boardID")

	var req struct {
		ColumnIDs []string `json:"columnIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.boardUC.ReorderColumns(r.Context(), userID, boardID, req.ColumnIDs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
