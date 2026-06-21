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
		insert into public.users (email, password_hash, name, avatar_url)
		values ($1, $2, $3, $4)
		returning id, email, password_hash, name, COALESCE(avatar_url, ''), updated_at, created_at
	`

	row := r.pool.QueryRow(ctx, q, user.Email, user.PasswordHash, nullIfEmpty(user.Name), nullIfEmpty(user.AvatarURL))
	var out domain.User
	if err := row.Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.AvatarURL, &out.UpdatedAt, &out.CreatedAt); err != nil {
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
		select id, email, password_hash, name, COALESCE(avatar_url, ''), updated_at, created_at
		from public.users
		where email = $1
		limit 1
	`

	var out domain.User
	err := r.pool.QueryRow(ctx, q, email).Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.AvatarURL, &out.UpdatedAt, &out.CreatedAt)
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
		select id, email, password_hash, name, COALESCE(avatar_url, ''), updated_at, created_at
		from public.users
		where id = $1
		limit 1
	`

	var out domain.User
	err := r.pool.QueryRow(ctx, q, id).Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.AvatarURL, &out.UpdatedAt, &out.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, err
	}
	return out, nil
}

func (r *UserRepo) Update(ctx context.Context, user domain.User) (domain.User, error) {
	const q = `
		update public.users
		set name = $2, avatar_url = $3
		where id = $1
		returning id, email, password_hash, name, COALESCE(avatar_url, ''), updated_at, created_at
	`

	var out domain.User
	err := r.pool.QueryRow(ctx, q, user.ID, nullIfEmpty(user.Name), nullIfEmpty(user.AvatarURL)).
		Scan(&out.ID, &out.Email, &out.PasswordHash, &out.Name, &out.AvatarURL, &out.UpdatedAt, &out.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, err
	}
	return out, nil
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id string, newHash string) error {
	const q = `update public.users set password_hash = $2 where id = $1`
	tag, err := r.pool.Exec(ctx, q, id, newHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *UserRepo) Search(ctx context.Context, keyword string, limit, offset int) ([]domain.User, error) {
	const q = `
		select id, email, name, COALESCE(avatar_url, ''), updated_at, created_at
		from public.users
		where (name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%')
		order by name asc
		limit $2 offset $3
	`

	rows, err := r.pool.Query(ctx, q, keyword, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.UpdatedAt, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, rows.Err()
}

func (r *UserRepo) GetPreferences(ctx context.Context, userID string) (domain.UserPreferences, error) {
	const q = `
		with inserted as (
			insert into public.user_preferences (user_id)
			values ($1)
			on conflict (user_id) do nothing
		)
		select language, compact_mode, email_notifications
		from public.user_preferences where user_id = $1
	`
	var out domain.UserPreferences
	err := r.pool.QueryRow(ctx, q, userID).Scan(&out.Language, &out.CompactMode, &out.EmailNotifications)
	if err != nil {
		return domain.UserPreferences{}, err
	}
	return out, nil
}

func (r *UserRepo) UpdatePreferences(ctx context.Context, userID string, preferences domain.UserPreferences) (domain.UserPreferences, error) {
	const q = `
		insert into public.user_preferences (user_id, language, compact_mode, email_notifications)
		values ($1, $2, $3, $4)
		on conflict (user_id) do update set
			language = excluded.language,
			compact_mode = excluded.compact_mode,
			email_notifications = excluded.email_notifications
		returning language, compact_mode, email_notifications
	`
	var out domain.UserPreferences
	err := r.pool.QueryRow(ctx, q, userID, preferences.Language, preferences.CompactMode, preferences.EmailNotifications).
		Scan(&out.Language, &out.CompactMode, &out.EmailNotifications)
	if err != nil {
		return domain.UserPreferences{}, err
	}
	return out, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
