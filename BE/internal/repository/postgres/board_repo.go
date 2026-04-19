package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

// BoardRepo KHÔNG chứa logic nghiệp vụ hay phân quyền.
// File này CHỈ chịu trách nhiệm thiết lập các câu truy vấn SQL cho bảng boards và board_columns.
type BoardRepo struct {
	pool *pgxpool.Pool
}

func NewBoardRepo(pool *pgxpool.Pool) *BoardRepo {
	return &BoardRepo{pool: pool}
}

// === Thao tác trong Transaction ===

func (r *BoardRepo) CreateTx(ctx context.Context, tx pgx.Tx, board *domain.Board) (*domain.Board, error) {
	query := `
		INSERT INTO boards (project_id, name, is_default)
		VALUES ($1, $2, $3)
		RETURNING id, project_id, name, is_default, created_at, updated_at
	`
	b := &domain.Board{}
	err := tx.QueryRow(ctx, query, board.ProjectID, board.Name, board.IsDefault).Scan(
		&b.ID, &b.ProjectID, &b.Name, &b.IsDefault, &b.CreatedAt, &b.UpdatedAt,
	)
	return b, err
}

func (r *BoardRepo) CreateColumnTx(ctx context.Context, tx pgx.Tx, col *domain.BoardColumn) (*domain.BoardColumn, error) {
	query := `
		INSERT INTO board_columns (board_id, name, position, status_map)
		VALUES ($1, $2, $3, $4)
		RETURNING id, board_id, name, position, status_map, created_at
	`
	c := &domain.BoardColumn{}
	err := tx.QueryRow(ctx, query, col.BoardID, col.Name, col.Position, col.StatusMap).Scan(
		&c.ID, &c.BoardID, &c.Name, &c.Position, &c.StatusMap, &c.CreatedAt,
	)
	return c, err
}

// === Thao tác đọc/ghi đơn lẻ ===

func (r *BoardRepo) GetByID(ctx context.Context, id string) (*domain.Board, error) {
	query := `
		SELECT id, project_id, name, is_default, created_at, updated_at
		FROM boards WHERE id = $1
	`
	b := &domain.Board{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.ProjectID, &b.Name, &b.IsDefault, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

func (r *BoardRepo) ListByProject(ctx context.Context, projectID string) ([]*domain.Board, error) {
	query := `
		SELECT id, project_id, name, is_default, created_at, updated_at
		FROM boards WHERE project_id = $1
		ORDER BY is_default DESC, created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []*domain.Board
	for rows.Next() {
		b := &domain.Board{}
		if err := rows.Scan(&b.ID, &b.ProjectID, &b.Name, &b.IsDefault, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		boards = append(boards, b)
	}
	return boards, nil
}

func (r *BoardRepo) Update(ctx context.Context, id string, patch *domain.BoardPatch) (*domain.Board, error) {
	query := `
		UPDATE boards SET name = COALESCE($1, name), updated_at = now()
		WHERE id = $2
		RETURNING id, project_id, name, is_default, created_at, updated_at
	`
	b := &domain.Board{}
	err := r.pool.QueryRow(ctx, query, patch.Name, id).Scan(
		&b.ID, &b.ProjectID, &b.Name, &b.IsDefault, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

func (r *BoardRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM boards WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// === Thao tác với cột ===

func (r *BoardRepo) GetColumns(ctx context.Context, boardID string) ([]*domain.BoardColumn, error) {
	query := `
		SELECT id, board_id, name, position, status_map, created_at
		FROM board_columns WHERE board_id = $1
		ORDER BY position ASC
	`
	rows, err := r.pool.Query(ctx, query, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []*domain.BoardColumn
	for rows.Next() {
		c := &domain.BoardColumn{}
		if err := rows.Scan(&c.ID, &c.BoardID, &c.Name, &c.Position, &c.StatusMap, &c.CreatedAt); err != nil {
			return nil, err
		}
		cols = append(cols, c)
	}
	return cols, nil
}

func (r *BoardRepo) UpdateColumn(ctx context.Context, colID string, patch *domain.BoardColumnPatch) (*domain.BoardColumn, error) {
	query := `
		UPDATE board_columns
		SET name = COALESCE($1, name), status_map = COALESCE($2, status_map)
		WHERE id = $3
		RETURNING id, board_id, name, position, status_map, created_at
	`
	c := &domain.BoardColumn{}
	err := r.pool.QueryRow(ctx, query, patch.Name, patch.StatusMap, colID).Scan(
		&c.ID, &c.BoardID, &c.Name, &c.Position, &c.StatusMap, &c.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *BoardRepo) DeleteColumn(ctx context.Context, colID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM board_columns WHERE id = $1`, colID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ReorderColumns cập nhật thứ tự các cột dựa trên danh sách ID được gửi từ Frontend (kéo thả).
func (r *BoardRepo) ReorderColumns(ctx context.Context, boardID string, columnIDs []string) error {
	for i, colID := range columnIDs {
		tag, err := r.pool.Exec(ctx,
			`UPDATE board_columns SET position = $1 WHERE id = $2 AND board_id = $3`,
			i, colID, boardID,
		)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("%w: column %s", domain.ErrNotFound, colID)
		}
	}
	return nil
}

// === Truy vấn hỗ trợ ===

func (r *BoardRepo) GetProjectIDByBoardID(ctx context.Context, boardID string) (string, error) {
	var projectID string
	err := r.pool.QueryRow(ctx, `SELECT project_id FROM boards WHERE id = $1`, boardID).Scan(&projectID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", domain.ErrNotFound
		}
		return "", err
	}
	return projectID, nil
}
