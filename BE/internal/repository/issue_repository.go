package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
)

// IssueRepository định nghĩa các thao tác CSDL cho bảng issues.
type IssueRepository interface {
	// Thao tác trong Transaction (dùng khi tạo issue — atomic increment counter + insert)
	CreateTx(ctx context.Context, tx pgx.Tx, issue *domain.Issue) (*domain.Issue, error)
	NextIssueNumberTx(ctx context.Context, tx pgx.Tx, projectID string) (int, error)

	// Thao tác đọc/ghi đơn lẻ
	GetByID(ctx context.Context, id string) (*domain.Issue, error)
	GetByKey(ctx context.Context, key string) (*domain.Issue, error)
	List(ctx context.Context, projectID string, filter domain.IssueFilter) ([]*domain.Issue, int64, error)
	Update(ctx context.Context, id string, patch *domain.IssuePatch) (*domain.Issue, error)
	SoftDelete(ctx context.Context, id string) error

	// Thao tác chuyên biệt
	UpdateStatus(ctx context.Context, id string, status string) (*domain.Issue, error)
	UpdateAssignee(ctx context.Context, id string, assigneeID *string) (*domain.Issue, error)
	ListSubtasks(ctx context.Context, parentID string) ([]*domain.Issue, error)
}
