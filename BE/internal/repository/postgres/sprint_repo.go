package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

type SprintRepo struct {
	pool *pgxpool.Pool
}

func NewSprintRepo(pool *pgxpool.Pool) *SprintRepo {
	return &SprintRepo{pool: pool}
}

const sprintColumns = `id, project_id, name, goal, status, start_date, end_date, created_by, created_at, updated_at`

func scanSprint(row pgx.Row) (*domain.Sprint, error) {
	s := &domain.Sprint{}
	err := row.Scan(
		&s.ID, &s.ProjectID, &s.Name, &s.Goal, &s.Status,
		&s.StartDate, &s.EndDate, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SprintRepo) Create(ctx context.Context, sprint *domain.Sprint) (*domain.Sprint, error) {
	const q = `
		INSERT INTO public.sprints (project_id, name, goal, start_date, end_date, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + sprintColumns
	return scanSprint(r.pool.QueryRow(ctx, q,
		sprint.ProjectID, sprint.Name, sprint.Goal, sprint.StartDate, sprint.EndDate, sprint.CreatedBy,
	))
}

func (r *SprintRepo) GetByID(ctx context.Context, sprintID string) (*domain.Sprint, error) {
	q := `SELECT ` + sprintColumns + ` FROM public.sprints WHERE id = $1`
	return scanSprint(r.pool.QueryRow(ctx, q, sprintID))
}

func (r *SprintRepo) List(ctx context.Context, projectID string) ([]*domain.Sprint, error) {
	q := `SELECT ` + sprintColumns + ` FROM public.sprints WHERE project_id = $1 ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, q, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sprints []*domain.Sprint
	for rows.Next() {
		s := &domain.Sprint{}
		if err := rows.Scan(
			&s.ID, &s.ProjectID, &s.Name, &s.Goal, &s.Status,
			&s.StartDate, &s.EndDate, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		sprints = append(sprints, s)
	}
	return sprints, rows.Err()
}

func (r *SprintRepo) Update(ctx context.Context, sprintID string, patch *domain.SprintPatch) (*domain.Sprint, error) {
	const q = `
		UPDATE public.sprints
		SET name       = COALESCE($2, name),
			goal       = COALESCE($3, goal),
			start_date = COALESCE($4, start_date),
			end_date   = COALESCE($5, end_date)
		WHERE id = $1
		RETURNING ` + sprintColumns
	return scanSprint(r.pool.QueryRow(ctx, q, sprintID,
		patch.Name, patch.Goal, patch.StartDate, patch.EndDate,
	))
}

func (r *SprintRepo) HasActiveSprint(ctx context.Context, projectID string) (bool, error) {
	const q = `SELECT EXISTS(SELECT 1 FROM public.sprints WHERE project_id = $1 AND status = 'active')`
	var exists bool
	err := r.pool.QueryRow(ctx, q, projectID).Scan(&exists)
	return exists, err
}

func (r *SprintRepo) Start(ctx context.Context, sprintID string) (*domain.Sprint, error) {
	const q = `
		UPDATE public.sprints
		SET status = 'active', start_date = COALESCE(start_date, now())
		WHERE id = $1 AND status = 'planning'
		RETURNING ` + sprintColumns
	return scanSprint(r.pool.QueryRow(ctx, q, sprintID))
}

func (r *SprintRepo) Complete(ctx context.Context, sprintID string) (*domain.Sprint, error) {
	const q = `
		UPDATE public.sprints
		SET status = 'completed', end_date = COALESCE(end_date, now())
		WHERE id = $1 AND status = 'active'
		RETURNING ` + sprintColumns
	return scanSprint(r.pool.QueryRow(ctx, q, sprintID))
}
