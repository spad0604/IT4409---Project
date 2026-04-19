package usecase

import (
	"context"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/pkg/jwtutil"
	"it4409/internal/pkg/password"
	"it4409/internal/repository"
)

type AuthUsecase struct {
	users repository.UserRepository
	jwt   jwtutil.Service
}

func NewAuthUsecase(users repository.UserRepository, jwtSvc jwtutil.Service) *AuthUsecase {
	return &AuthUsecase{users: users, jwt: jwtSvc}
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string
}

type AuthOutput struct {
	Token string
	User  domain.User
}

func (u *AuthUsecase) Register(ctx context.Context, in RegisterInput) (AuthOutput, error) {
	email := strings.TrimSpace(strings.ToLower(in.Email))
	if email == "" || len(in.Password) < 6 {
		return AuthOutput{}, domain.ErrInvalidInput
	}

	hash, err := password.Hash(in.Password)
	if err != nil {
		return AuthOutput{}, err
	}

	created, err := u.users.Create(ctx, domain.User{Email: email, PasswordHash: hash, Name: strings.TrimSpace(in.Name)})
	if err != nil {
		return AuthOutput{}, err
	}

	token, err := u.jwt.Sign(created.ID, created.Email)
	if err != nil {
		return AuthOutput{}, err
	}

	created.PasswordHash = ""
	return AuthOutput{Token: token, User: created}, nil
}

type LoginInput struct {
	Email    string
	Password string
}

func (u *AuthUsecase) Login(ctx context.Context, in LoginInput) (AuthOutput, error) {
	email := strings.TrimSpace(strings.ToLower(in.Email))
	if email == "" || in.Password == "" {
		return AuthOutput{}, domain.ErrInvalidInput
	}

	user, err := u.users.GetByEmail(ctx, email)
	if err != nil {
		if err == domain.ErrNotFound {
			return AuthOutput{}, domain.ErrUnauthorized
		}
		return AuthOutput{}, err
	}

	if err := password.Compare(user.PasswordHash, in.Password); err != nil {
		return AuthOutput{}, domain.ErrUnauthorized
	}

	token, err := u.jwt.Sign(user.ID, user.Email)
	if err != nil {
		return AuthOutput{}, err
	}

	user.PasswordHash = ""
	return AuthOutput{Token: token, User: user}, nil
}

func (u *AuthUsecase) Me(ctx context.Context, userID string) (domain.User, error) {
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

// ChangePassword verifies the old password then updates to the new one.
func (u *AuthUsecase) ChangePassword(ctx context.Context, userID, oldPwd, newPwd string) error {
	if strings.TrimSpace(userID) == "" {
		return domain.ErrUnauthorized
	}
	if len(newPwd) < 6 {
		return domain.ErrInvalidInput
	}

	user, err := u.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if err := password.Compare(user.PasswordHash, oldPwd); err != nil {
		return domain.ErrUnauthorized
	}

	hash, err := password.Hash(newPwd)
	if err != nil {
		return err
	}

	return u.users.UpdatePassword(ctx, userID, hash)
}

// RefreshToken issues a new JWT for the given user.
func (u *AuthUsecase) RefreshToken(ctx context.Context, userID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", domain.ErrUnauthorized
	}

	user, err := u.users.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}

	return u.jwt.Sign(user.ID, user.Email)
}
