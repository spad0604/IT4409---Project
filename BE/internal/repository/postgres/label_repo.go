package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

// LabelRepo KHÔNG chứa logic nghiệp vụ hay phân quyền.
// File này CHỈ chịu trách nhiệm thiết lập các câu truy vấn SQL cho bảng labels và issue_labels.
type LabelRepo struct {
	pool *pgxpool.Pool
}

func NewLabelRepo(pool *pgxpool.Pool) *LabelRepo {
	return &LabelRepo{pool: pool}
}

func (r *LabelRepo) Create(ctx context.Context, label *domain.Label) (*domain.Label, error) {
	query := `
		INSERT INTO labels (project_id, name, color)
		VALUES ($1, $2, $3)
		RETURNING id, project_id, name, color, created_at
	`
	l := &domain.Label{}
	err := r.pool.QueryRow(ctx, query, label.ProjectID, label.Name, label.Color).Scan(
		&l.ID, &l.ProjectID, &l.Name, &l.Color, &l.CreatedAt,
	)
	return l, err
}

func (r *LabelRepo) ListByProject(ctx context.Context, projectID string) ([]*domain.Label, error) {
	query := `
		SELECT id, project_id, name, color, created_at
		FROM labels WHERE project_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []*domain.Label
	for rows.Next() {
		l := &domain.Label{}
		if err := rows.Scan(&l.ID, &l.ProjectID, &l.Name, &l.Color, &l.CreatedAt); err != nil {
			return nil, err
		}
		labels = append(labels, l)
	}
	return labels, nil
}

func (r *LabelRepo) GetByID(ctx context.Context, id string) (*domain.Label, error) {
	query := `SELECT id, project_id, name, color, created_at FROM labels WHERE id = $1`
	l := &domain.Label{}
	err := r.pool.QueryRow(ctx, query, id).Scan(&l.ID, &l.ProjectID, &l.Name, &l.Color, &l.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return l, nil
}

func (r *LabelRepo) Update(ctx context.Context, id string, patch *domain.LabelPatch) (*domain.Label, error) {
	query := `
		UPDATE labels SET name = COALESCE($1, name), color = COALESCE($2, color)
		WHERE id = $3
		RETURNING id, project_id, name, color, created_at
	`
	l := &domain.Label{}
	err := r.pool.QueryRow(ctx, query, patch.Name, patch.Color, id).Scan(
		&l.ID, &l.ProjectID, &l.Name, &l.Color, &l.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return l, nil
}

func (r *LabelRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM labels WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// === Gắn/gỡ nhãn khỏi công việc ===

func (r *LabelRepo) AttachToIssue(ctx context.Context, issueID, labelID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		issueID, labelID,
	)
	return err
}

func (r *LabelRepo) DetachFromIssue(ctx context.Context, issueID, labelID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM issue_labels WHERE issue_id = $1 AND label_id = $2`,
		issueID, labelID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *LabelRepo) ListByIssue(ctx context.Context, issueID string) ([]*domain.Label, error) {
	query := `
		SELECT l.id, l.project_id, l.name, l.color, l.created_at
		FROM labels l
		INNER JOIN issue_labels il ON il.label_id = l.id
		WHERE il.issue_id = $1
		ORDER BY l.name ASC
	`
	rows, err := r.pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []*domain.Label
	for rows.Next() {
		l := &domain.Label{}
		if err := rows.Scan(&l.ID, &l.ProjectID, &l.Name, &l.Color, &l.CreatedAt); err != nil {
			return nil, err
		}
		labels = append(labels, l)
	}
	return labels, nil
}

// === Truy vấn hỗ trợ ===

func (r *LabelRepo) GetProjectIDByLabelID(ctx context.Context, labelID string) (string, error) {
	var projectID string
	err := r.pool.QueryRow(ctx, `SELECT project_id FROM labels WHERE id = $1`, labelID).Scan(&projectID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", domain.ErrNotFound
		}
		return "", err
	}
	return projectID, nil
}
