package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

type AttachmentRepo struct {
	pool *pgxpool.Pool
}

func NewAttachmentRepo(pool *pgxpool.Pool) *AttachmentRepo {
	return &AttachmentRepo{pool: pool}
}

const attachmentColumns = `id, issue_id, uploaded_by, filename, file_size, mime_type, storage_path, created_at`

func scanAttachment(row pgx.Row) (*domain.Attachment, error) {
	a := &domain.Attachment{}
	err := row.Scan(&a.ID, &a.IssueID, &a.UploadedBy, &a.Filename, &a.FileSize, &a.MimeType, &a.StoragePath, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AttachmentRepo) Create(ctx context.Context, att *domain.Attachment) (*domain.Attachment, error) {
	const q = `
		INSERT INTO public.attachments (issue_id, uploaded_by, filename, file_size, mime_type, storage_path)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + attachmentColumns

	return scanAttachment(r.pool.QueryRow(ctx, q,
		att.IssueID, att.UploadedBy, att.Filename, att.FileSize, att.MimeType, att.StoragePath,
	))
}

func (r *AttachmentRepo) ListByIssue(ctx context.Context, issueID string) ([]*domain.Attachment, error) {
	q := `SELECT ` + attachmentColumns + ` FROM public.attachments WHERE issue_id = $1 ORDER BY created_at ASC`
	rows, err := r.pool.Query(ctx, q, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var atts []*domain.Attachment
	for rows.Next() {
		a := &domain.Attachment{}
		if err := rows.Scan(&a.ID, &a.IssueID, &a.UploadedBy, &a.Filename, &a.FileSize, &a.MimeType, &a.StoragePath, &a.CreatedAt); err != nil {
			return nil, err
		}
		atts = append(atts, a)
	}
	return atts, rows.Err()
}

func (r *AttachmentRepo) GetByID(ctx context.Context, id string) (*domain.Attachment, error) {
	q := `SELECT ` + attachmentColumns + ` FROM public.attachments WHERE id = $1`
	return scanAttachment(r.pool.QueryRow(ctx, q, id))
}

func (r *AttachmentRepo) Delete(ctx context.Context, id string) error {
	const q = `DELETE FROM public.attachments WHERE id = $1`
	cmd, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
