package usecase

import (
	"context"
	"net/http"
	"strings"

	"it4409/internal/domain"
)

func GoogleProfile(ctx context.Context, client *http.Client) (OAuthProfile, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return OAuthProfile{}, err
	}

	res, err := client.Do(req)
	if err != nil {
		return OAuthProfile{}, err
	}

	var body struct {
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := decodeJSONResponse(res, &body); err != nil {
		return OAuthProfile{}, err
	}
	if strings.TrimSpace(body.Email) == "" || !body.VerifiedEmail {
		return OAuthProfile{}, domain.ErrUnauthorized
	}

	return OAuthProfile{Email: body.Email, Name: body.Name, AvatarURL: body.Picture}, nil
}

func GitHubProfile(ctx context.Context, client *http.Client) (OAuthProfile, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return OAuthProfile{}, err
	}

	res, err := client.Do(req)
	if err != nil {
		return OAuthProfile{}, err
	}

	var user struct {
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := decodeJSONResponse(res, &user); err != nil {
		return OAuthProfile{}, err
	}

	email := strings.TrimSpace(user.Email)
	if email == "" {
		email, err = githubPrimaryEmail(ctx, client)
		if err != nil {
			return OAuthProfile{}, err
		}
	}
	if strings.TrimSpace(email) == "" {
		return OAuthProfile{}, domain.ErrUnauthorized
	}

	name := strings.TrimSpace(user.Name)
	if name == "" {
		name = strings.TrimSpace(user.Login)
	}

	return OAuthProfile{Email: email, Name: name, AvatarURL: user.AvatarURL}, nil
}

func githubPrimaryEmail(ctx context.Context, client *http.Client) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}

	res, err := client.Do(req)
	if err != nil {
		return "", err
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	if err := decodeJSONResponse(res, &emails); err != nil {
		return "", err
	}

	for _, item := range emails {
		if item.Primary && item.Verified && strings.TrimSpace(item.Email) != "" {
			return item.Email, nil
		}
	}
	for _, item := range emails {
		if item.Verified && strings.TrimSpace(item.Email) != "" {
			return item.Email, nil
		}
	}

	return "", domain.ErrUnauthorized
}
