package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
)

type ProjectRepository interface {
	CreateTx(ctx context.Context, tx pgx.Tx, project *domain.Project) (*domain.Project, error)
	GetByID(ctx context.Context, id string) (*domain.Project, error)
	List(ctx context.Context, userID string) ([]*domain.Project, error)
	Update(ctx context.Context, id string, patch *domain.ProjectPatch) (*domain.Project, error)
	SoftDelete(ctx context.Context, id string) error

	AddMemberTx(ctx context.Context, tx pgx.Tx, member *domain.ProjectMember) error
	RemoveMember(ctx context.Context, projectID, userID string) error
	GetMembers(ctx context.Context, projectID string) ([]*domain.ProjectMember, error)
	GetMemberRole(ctx context.Context, projectID, userID string) (string, error)

	InitCounterTx(ctx context.Context, tx pgx.Tx, projectID string) error
}
