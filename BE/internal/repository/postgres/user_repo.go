package postgres

import (
	"context"
	"errors"

	"it4409/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) Create(ctx context.Context, user domain.User) (domain.User, error) {
	const q = `
		insert into public.users (email, password_hash, name)
		values ($1, $2, $3)
		returning id, email, password_hash, name, created_at
	`

	row := r.pool.QueryRow(ctx, q, user.Email, user.PasswordHash, nullIfEmpty(user.Name))
	var out domain.User
	if err := row.Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.CreatedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" { // unique_violation
				return domain.User{}, domain.ErrConflict
			}
		}
		return domain.User{}, err
	}
	return out, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (domain.User, error) {
	const q = `
		select id, email, password_hash, name, created_at
		from public.users
		where email = $1
		limit 1
	`

	var out domain.User
	err := r.pool.QueryRow(ctx, q, email).Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, err
	}
	return out, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (domain.User, error) {
	const q = `
		select id, email, password_hash, name, created_at
		from public.users
		where id = $1
		limit 1
	`

	var out domain.User
	err := r.pool.QueryRow(ctx, q, id).Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, err
	}
	return out, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
