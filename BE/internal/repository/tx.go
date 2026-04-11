package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// TxManager định nghĩa interface cho quản lý giao dịch
type TxManager interface {
	WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error
}
