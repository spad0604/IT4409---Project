package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgTxManager struct {
	pool *pgxpool.Pool
}

func NewPgTxManager(pool *pgxpool.Pool) *PgTxManager {
	return &PgTxManager{pool: pool}
}

func (m *PgTxManager) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	// 1. Khởi tạo một Giao dịch (Transaction) mới tới cơ sở dữ liệu
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return err
	}

	defer func() {
		// 2. Đảm bảo an toàn: Tự động Rollback (hủy bỏ toàn bộ thao tác SQL) nếu hàm fn() trả về lỗi hoặc Server bị sập đột ngột
		_ = tx.Rollback(ctx)
	}()

	// 3. Thực thi khối logic nghiệp vụ gộp nhiều bước (VD: Vừa tạo Dự án, vừa thêm Thành viên)
	if err := fn(tx); err != nil {
		return err
	}

	// 4. Nếu khối logic trên chạy không có bất kỳ lỗi nào, ta chính thức lưu dữ liệu vào DB (Commit)
	return tx.Commit(ctx)
}
