package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
)

// BoardRepository định nghĩa các thao tác với bảng Kanban và cột trong CSDL.
type BoardRepository interface {
	// === Thao tác trong Transaction (dùng khi tạo dự án kèm bảng mặc định) ===
	CreateTx(ctx context.Context, tx pgx.Tx, board *domain.Board) (*domain.Board, error)
	CreateColumnTx(ctx context.Context, tx pgx.Tx, col *domain.BoardColumn) (*domain.BoardColumn, error)

	// === Thao tác đọc/ghi đơn lẻ ===
	GetByID(ctx context.Context, id string) (*domain.Board, error)
	ListByProject(ctx context.Context, projectID string) ([]*domain.Board, error)
	Update(ctx context.Context, id string, patch *domain.BoardPatch) (*domain.Board, error)
	Delete(ctx context.Context, id string) error

	// === Thao tác với cột ===
	GetColumns(ctx context.Context, boardID string) ([]*domain.BoardColumn, error)
	UpdateColumn(ctx context.Context, colID string, patch *domain.BoardColumnPatch) (*domain.BoardColumn, error)
	DeleteColumn(ctx context.Context, colID string) error
	ReorderColumns(ctx context.Context, boardID string, columnIDs []string) error

	// === Truy vấn hỗ trợ ===
	GetProjectIDByBoardID(ctx context.Context, boardID string) (string, error)
}
