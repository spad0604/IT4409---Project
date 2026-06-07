package repository

import (
	"context"

	"it4409/internal/domain"
)

// LabelRepository định nghĩa các thao tác với nhãn dán trong CSDL.
type LabelRepository interface {
	Create(ctx context.Context, label *domain.Label) (*domain.Label, error)
	ListByProject(ctx context.Context, projectID string) ([]*domain.Label, error)
	GetByID(ctx context.Context, id string) (*domain.Label, error)
	Update(ctx context.Context, id string, patch *domain.LabelPatch) (*domain.Label, error)
	Delete(ctx context.Context, id string) error

	// === Gắn/gỡ nhãn khỏi công việc (bảng trung gian issue_labels) ===
	AttachToIssue(ctx context.Context, issueID, labelID string) error
	DetachFromIssue(ctx context.Context, issueID, labelID string) error
	ListByIssue(ctx context.Context, issueID string) ([]*domain.Label, error)

	// === Truy vấn hỗ trợ ===
	GetProjectIDByLabelID(ctx context.Context, labelID string) (string, error)
}
