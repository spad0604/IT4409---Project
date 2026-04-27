package handler

import (
	"mime"
	"net/http"
	"path/filepath"
	"time"

	"it4409/internal/usecase"

	"github.com/go-chi/chi/v5"
)

type AttachmentHandler struct {
	attUC *usecase.AttachmentUsecase
}

func NewAttachmentHandler(uc *usecase.AttachmentUsecase) *AttachmentHandler {
	return &AttachmentHandler{attUC: uc}
}

func (h *AttachmentHandler) RegisterRoutes(r chi.Router) {
	r.Post("/issues/{issueKey}/attachments", h.Upload)
	r.Get("/issues/{issueKey}/attachments", h.List)
	r.Get("/attachments/{attachmentID}", h.Download)
	r.Delete("/attachments/{attachmentID}", h.Delete)
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

type AttachmentDTO struct {
	ID          string    `json:"id"`
	IssueID     string    `json:"issueId"`
	UploadedBy  string    `json:"uploadedBy"`
	Filename    string    `json:"filename"`
	FileSize    int64     `json:"fileSize"`
	MimeType    string    `json:"mimeType"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ─── Handlers ────────────────────────────────────────────────────────────────

func (h *AttachmentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	// Giới hạn 10 MB
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file quá lớn (max 10MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "thiếu file trong form")
		return
	}
	defer file.Close()

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = mime.TypeByExtension(filepath.Ext(header.Filename))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}

	att, err := h.attUC.Upload(r.Context(), userID, issueKey, header.Filename, mimeType, header.Size, file)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, AttachmentDTO{
		ID: att.ID, IssueID: att.IssueID, UploadedBy: att.UploadedBy,
		Filename: att.Filename, FileSize: att.FileSize, MimeType: att.MimeType,
		CreatedAt: att.CreatedAt,
	})
}

func (h *AttachmentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	issueKey := chi.URLParam(r, "issueKey")

	atts, err := h.attUC.List(r.Context(), userID, issueKey)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	dtos := make([]AttachmentDTO, len(atts))
	for i, a := range atts {
		dtos[i] = AttachmentDTO{
			ID: a.ID, IssueID: a.IssueID, UploadedBy: a.UploadedBy,
			Filename: a.Filename, FileSize: a.FileSize, MimeType: a.MimeType,
			CreatedAt: a.CreatedAt,
		}
	}
	writeSuccess(w, http.StatusOK, dtos)
}

func (h *AttachmentHandler) Download(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	attachmentID := chi.URLParam(r, "attachmentID")
	if _, ok := parseUUID(w, attachmentID); !ok {
		return
	}

	att, err := h.attUC.GetByID(r.Context(), userID, attachmentID)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	filePath := h.attUC.FilePath(att.StoragePath)
	w.Header().Set("Content-Disposition", "attachment; filename=\""+att.Filename+"\"")
	w.Header().Set("Content-Type", att.MimeType)
	http.ServeFile(w, r, filePath)
}

func (h *AttachmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	attachmentID := chi.URLParam(r, "attachmentID")
	if _, ok := parseUUID(w, attachmentID); !ok {
		return
	}

	if err := h.attUC.Delete(r.Context(), userID, attachmentID); err != nil {
		writeDomainError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, nil)
}
