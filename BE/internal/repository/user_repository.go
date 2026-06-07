package repository

import (
	"context"

	"it4409/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user domain.User) (domain.User, error)
	GetByEmail(ctx context.Context, email string) (domain.User, error)
	GetByID(ctx context.Context, id string) (domain.User, error)
	Update(ctx context.Context, user domain.User) (domain.User, error)
	UpdatePassword(ctx context.Context, id string, newHash string) error
	Search(ctx context.Context, keyword string, limit, offset int) ([]domain.User, error)
}
