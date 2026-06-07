package handler

import (
	"net/http"

	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type SearchHandler struct {
	searchUC *usecase.SearchUsecase
}

func NewSearchHandler(uc *usecase.SearchUsecase) *SearchHandler {
	return &SearchHandler{searchUC: uc}
}

func (h *SearchHandler) RegisterRoutes(r chi.Router) {
	r.Get("/search", h.Search)
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		writeError(w, http.StatusBadRequest, "query param 'q' is required")
		return
	}

	filterType := r.URL.Query().Get("type")
	projectID := r.URL.Query().Get("project_id")

	result, err := h.searchUC.Search(r.Context(), userID, q, filterType, projectID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, result)
}
