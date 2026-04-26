package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

type CommentRepo struct {
	pool *pgxpool.Pool
}

func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

const commentColumns = `id, issue_id, user_id, content, created_at, updated_at`

func scanComment(row pgx.Row) (*domain.Comment, error) {
	c := &domain.Comment{}
	err := row.Scan(&c.ID, &c.IssueID, &c.UserID, &c.Content, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *CommentRepo) Create(ctx context.Context, comment *domain.Comment) (*domain.Comment, error) {
	const q = `
		INSERT INTO public.comments (issue_id, user_id, content)
		VALUES ($1, $2, $3)
		RETURNING ` + commentColumns

	return scanComment(r.pool.QueryRow(ctx, q, comment.IssueID, comment.UserID, comment.Content))
}

func (r *CommentRepo) List(ctx context.Context, issueID string, limit, offset int) ([]*domain.Comment, int64, error) {
	// Count
	var total int64
	countQ := `SELECT COUNT(*) FROM public.comments WHERE issue_id = $1`
	if err := r.pool.QueryRow(ctx, countQ, issueID).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	dataQ := `SELECT ` + commentColumns + ` FROM public.comments WHERE issue_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, dataQ, issueID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var comments []*domain.Comment
	for rows.Next() {
		c := &domain.Comment{}
		if err := rows.Scan(&c.ID, &c.IssueID, &c.UserID, &c.Content, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		comments = append(comments, c)
	}
	return comments, total, rows.Err()
}

func (r *CommentRepo) GetByID(ctx context.Context, id string) (*domain.Comment, error) {
	q := `SELECT ` + commentColumns + ` FROM public.comments WHERE id = $1`
	return scanComment(r.pool.QueryRow(ctx, q, id))
}

func (r *CommentRepo) Update(ctx context.Context, id string, content string) (*domain.Comment, error) {
	q := `UPDATE public.comments SET content = $2, updated_at = now() WHERE id = $1 RETURNING ` + commentColumns
	return scanComment(r.pool.QueryRow(ctx, q, id, content))
}

func (r *CommentRepo) Delete(ctx context.Context, id string) error {
	const q = `DELETE FROM public.comments WHERE id = $1`
	cmd, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
