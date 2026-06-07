package usecase

import (
	"context"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type UserUsecase struct {
	users repository.UserRepository
}

func NewUserUsecase(users repository.UserRepository) *UserUsecase {
	return &UserUsecase{users: users}
}

type UpdateProfileInput struct {
	Name      *string `json:"name"`
	AvatarURL *string `json:"avatar_url"`
}

// GetProfile returns the authenticated user's profile.
func (u *UserUsecase) GetProfile(ctx context.Context, userID string) (domain.User, error) {
	if strings.TrimSpace(userID) == "" {
		return domain.User{}, domain.ErrUnauthorized
	}
	user, err := u.users.GetByID(ctx, userID)
	if err != nil {
		return domain.User{}, err
	}
	user.PasswordHash = ""
	return user, nil
}

// UpdateProfile updates the authenticated user's name and/or avatar.
func (u *UserUsecase) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (domain.User, error) {
	if strings.TrimSpace(userID) == "" {
		return domain.User{}, domain.ErrUnauthorized
	}

	existing, err := u.users.GetByID(ctx, userID)
	if err != nil {
		return domain.User{}, err
	}

	if input.Name != nil {
		existing.Name = strings.TrimSpace(*input.Name)
	}
	if input.AvatarURL != nil {
		existing.AvatarURL = strings.TrimSpace(*input.AvatarURL)
	}

	updated, err := u.users.Update(ctx, existing)
	if err != nil {
		return domain.User{}, err
	}
	updated.PasswordHash = ""
	return updated, nil
}

// GetUser returns a public view of another user's profile.
func (u *UserUsecase) GetUser(ctx context.Context, targetUserID string) (domain.User, error) {
	if strings.TrimSpace(targetUserID) == "" {
		return domain.User{}, domain.ErrInvalidInput
	}
	user, err := u.users.GetByID(ctx, targetUserID)
	if err != nil {
		return domain.User{}, err
	}
	user.PasswordHash = ""
	return user, nil
}

// SearchUsers searches users by name or email.
func (u *UserUsecase) SearchUsers(ctx context.Context, keyword string, limit, offset int) ([]domain.User, error) {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return []domain.User{}, nil
	}
	users, err := u.users.Search(ctx, keyword, limit, offset)
	if err != nil {
		return nil, err
	}
	for i := range users {
		users[i].PasswordHash = ""
	}
	return users, nil
}
