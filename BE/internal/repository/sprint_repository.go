package repository

import (
	"context"

	"it4409/internal/domain"
)

// SprintRepository defines data access for sprints.
type SprintRepository interface {
	Create(ctx context.Context, sprint *domain.Sprint) (*domain.Sprint, error)
	GetByID(ctx context.Context, sprintID string) (*domain.Sprint, error)
	List(ctx context.Context, projectID string) ([]*domain.Sprint, error)
	Update(ctx context.Context, sprintID string, patch *domain.SprintPatch) (*domain.Sprint, error)
	HasActiveSprint(ctx context.Context, projectID string) (bool, error)
	Start(ctx context.Context, sprintID string) (*domain.Sprint, error)
	Complete(ctx context.Context, sprintID string) (*domain.Sprint, error)
}
