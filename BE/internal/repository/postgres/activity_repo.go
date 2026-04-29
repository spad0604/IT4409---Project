package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

type ActivityRepo struct {
	pool *pgxpool.Pool
}

func NewActivityRepo(pool *pgxpool.Pool) *ActivityRepo {
	return &ActivityRepo{pool: pool}
}

const activityColumns = `id, issue_id, user_id, action, COALESCE(field, ''), COALESCE(old_value, ''), COALESCE(new_value, ''), created_at`

func (r *ActivityRepo) Create(ctx context.Context, activity *domain.Activity) error {
	const q = `
		INSERT INTO public.activity_log (issue_id, user_id, action, field, old_value, new_value)
		VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := r.pool.Exec(ctx, q,
		activity.IssueID, activity.UserID, activity.Action,
		nilIfEmpty(activity.Field), nilIfEmpty(activity.OldValue), nilIfEmpty(activity.NewValue),
	)
	return err
}

func (r *ActivityRepo) ListByIssue(ctx context.Context, issueID string, limit, offset int) ([]*domain.Activity, int64, error) {
	// Count
	var total int64
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM public.activity_log WHERE issue_id = $1`, issueID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	q := `SELECT ` + activityColumns + ` FROM public.activity_log WHERE issue_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	return r.queryActivities(ctx, q, total, issueID, limit, offset)
}

func (r *ActivityRepo) ListByProject(ctx context.Context, projectID string, limit, offset int) ([]*domain.Activity, int64, error) {
	// Count via JOIN
	var total int64
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM public.activity_log a JOIN public.issues i ON a.issue_id = i.id WHERE i.project_id = $1`,
		projectID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data via JOIN
	q := `SELECT a.` + activityColumns + `
		FROM public.activity_log a
		JOIN public.issues i ON a.issue_id = i.id
		WHERE i.project_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3`
	return r.queryActivities(ctx, q, total, projectID, limit, offset)
}

func (r *ActivityRepo) queryActivities(ctx context.Context, q string, total int64, filterID string, limit, offset int) ([]*domain.Activity, int64, error) {
	rows, err := r.pool.Query(ctx, q, filterID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var activities []*domain.Activity
	for rows.Next() {
		a := &domain.Activity{}
		if err := rows.Scan(
			&a.ID, &a.IssueID, &a.UserID, &a.Action,
			&a.Field, &a.OldValue, &a.NewValue, &a.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		activities = append(activities, a)
	}
	return activities, total, rows.Err()
}

// nilIfEmpty returns nil for empty strings so DB stores NULL instead of empty string.
func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
