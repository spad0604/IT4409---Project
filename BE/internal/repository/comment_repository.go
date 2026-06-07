package repository

import (
	"context"

	"it4409/internal/domain"
)

// CommentRepository định nghĩa các thao tác CSDL cho bảng comments.
type CommentRepository interface {
	Create(ctx context.Context, comment *domain.Comment) (*domain.Comment, error)
	List(ctx context.Context, issueID string, limit, offset int) ([]*domain.Comment, int64, error)
	GetByID(ctx context.Context, id string) (*domain.Comment, error)
	Update(ctx context.Context, id string, content string) (*domain.Comment, error)
	Delete(ctx context.Context, id string) error
}
