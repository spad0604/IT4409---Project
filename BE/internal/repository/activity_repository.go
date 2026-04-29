package repository

import (
	"context"

	"it4409/internal/domain"
)

// ActivityRepository defines data access for the activity log.
type ActivityRepository interface {
	// Create inserts a new activity log entry.
	Create(ctx context.Context, activity *domain.Activity) error

	// ListByIssue returns activity entries for a specific issue, ordered by newest first.
	ListByIssue(ctx context.Context, issueID string, limit, offset int) ([]*domain.Activity, int64, error)

	// ListByProject returns activity entries for all issues in a project, ordered by newest first.
	// Uses JOIN on issues.project_id since activity_log does not have a project_id column.
	ListByProject(ctx context.Context, projectID string, limit, offset int) ([]*domain.Activity, int64, error)
}
