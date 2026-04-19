package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"it4409/internal/delivery/http/middleware"
	"it4409/internal/domain"
)

// ─── Envelope Types ─────────────────────────────────────────────────────────

// Envelope is the standard JSON wrapper returned by every endpoint.
type Envelope struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// ─── Response Writers ───────────────────────────────────────────────────────

// writeJSON encodes body as JSON and writes it with the given HTTP status.
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// writeSuccess writes a success envelope: { status, message: "success", data }.
func writeSuccess(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, Envelope{Status: status, Message: "success", Data: data})
}

// writeError writes an error envelope: { status, message, data: null }.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, Envelope{Status: status, Message: message, Data: nil})
}

// writeDomainError maps a domain error to the appropriate HTTP status code.
func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrConflict):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, domain.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	default:
		log.Printf("internal error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

// ─── Request Helpers ────────────────────────────────────────────────────────

// parseBody decodes the JSON request body into dst.
func parseBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

// parseUUID validates a raw string looks like a UUID (simple length check + hex).
// If invalid, it writes a 400 response and returns false.
func parseUUID(w http.ResponseWriter, raw string) (string, bool) {
	// UUID v4: 36 chars "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
	if len(raw) != 36 {
		writeError(w, http.StatusBadRequest, "invalid uuid")
		return "", false
	}
	return raw, true
}

// parsePagination extracts page/per_page from query params, returns (limit, offset).
// Defaults: page=1, per_page=20. Max per_page=100.
func parsePagination(r *http.Request) (limit, offset int) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	return perPage, (page - 1) * perPage
}

// requireUserID extracts the authenticated user ID from request context.
// Writes 401 and returns false if not present.
func requireUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return "", false
	}
	return userID, true
}
