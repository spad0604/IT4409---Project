package repository

import (
	"context"
	"it4409/internal/domain"
)

type AttachmentRepository interface {
	Create(ctx context.Context, att *domain.Attachment) (*domain.Attachment, error)
	ListByIssue(ctx context.Context, issueID string) ([]*domain.Attachment, error)
	GetByID(ctx context.Context, id string) (*domain.Attachment, error)
	Delete(ctx context.Context, id string) error
}
