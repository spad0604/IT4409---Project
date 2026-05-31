package usecase

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"it4409/internal/domain"
	"it4409/internal/pkg/password"

	"golang.org/x/oauth2"
)

const oauthStateTTL = 10 * time.Minute

type OAuthProvider struct {
	Config      oauth2.Config
	ProfileFunc func(ctx context.Context, client *http.Client) (OAuthProfile, error)
}

type OAuthProfile struct {
	Email     string
	Name      string
	AvatarURL string
}

type oauthState struct {
	Provider string `json:"provider"`
	Nonce    string `json:"nonce"`
	Expires  int64  `json:"expires"`
}

func (u *AuthUsecase) OAuthStartURL(provider string) (string, error) {
	p, ok := u.oauthProvider(provider)
	if !ok {
		return "", domain.ErrInvalidInput
	}

	state, err := u.signOAuthState(provider)
	if err != nil {
		return "", err
	}

	return p.Config.AuthCodeURL(state, oauth2.AccessTypeOnline), nil
}

func (u *AuthUsecase) OAuthCallback(ctx context.Context, provider, code, state string) (AuthOutput, error) {
	provider = normalizeProvider(provider)
	if strings.TrimSpace(code) == "" || !u.validOAuthState(provider, state) {
		return AuthOutput{}, domain.ErrUnauthorized
	}

	p, ok := u.oauthProvider(provider)
	if !ok {
		return AuthOutput{}, domain.ErrInvalidInput
	}

	token, err := p.Config.Exchange(ctx, code)
	if err != nil {
		return AuthOutput{}, domain.ErrUnauthorized
	}

	profile, err := p.ProfileFunc(ctx, p.Config.Client(ctx, token))
	if err != nil {
		return AuthOutput{}, err
	}

	user, err := u.findOrCreateOAuthUser(ctx, profile)
	if err != nil {
		return AuthOutput{}, err
	}

	signed, err := u.jwt.Sign(user.ID, user.Email)
	if err != nil {
		return AuthOutput{}, err
	}

	user.PasswordHash = ""
	return AuthOutput{Token: signed, User: user}, nil
}

func (u *AuthUsecase) OAuthSuccessRedirect(token string) string {
	return oauthRedirect(u.frontendOAuthCallbackURL, map[string]string{"token": token})
}

func (u *AuthUsecase) OAuthErrorRedirect(message string) string {
	if strings.TrimSpace(message) == "" {
		message = "oauth_failed"
	}
	return oauthRedirect(u.frontendOAuthCallbackURL, map[string]string{"error": message})
}

func (u *AuthUsecase) oauthProvider(provider string) (OAuthProvider, bool) {
	provider = normalizeProvider(provider)
	p, ok := u.oauthProviders[provider]
	if !ok || p.Config.ClientID == "" || p.Config.ClientSecret == "" || p.ProfileFunc == nil {
		return OAuthProvider{}, false
	}
	return p, true
}

func (u *AuthUsecase) findOrCreateOAuthUser(ctx context.Context, profile OAuthProfile) (domain.User, error) {
	email := strings.TrimSpace(strings.ToLower(profile.Email))
	if email == "" {
		return domain.User{}, domain.ErrUnauthorized
	}

	existing, err := u.users.GetByEmail(ctx, email)
	if err == nil {
		changed := false
		if strings.TrimSpace(existing.Name) == "" && strings.TrimSpace(profile.Name) != "" {
			existing.Name = strings.TrimSpace(profile.Name)
			changed = true
		}
		if strings.TrimSpace(existing.AvatarURL) == "" && strings.TrimSpace(profile.AvatarURL) != "" {
			existing.AvatarURL = strings.TrimSpace(profile.AvatarURL)
			changed = true
		}
		if changed {
			if updated, updateErr := u.users.Update(ctx, existing); updateErr == nil {
				existing = updated
			}
		}
		existing.PasswordHash = ""
		return existing, nil
	}
	if err != domain.ErrNotFound {
		return domain.User{}, err
	}

	hash, err := randomOAuthPasswordHash()
	if err != nil {
		return domain.User{}, err
	}

	created, err := u.users.Create(ctx, domain.User{
		Email:        email,
		PasswordHash: hash,
		Name:         strings.TrimSpace(profile.Name),
		AvatarURL:    strings.TrimSpace(profile.AvatarURL),
	})
	if err == domain.ErrConflict {
		created, err = u.users.GetByEmail(ctx, email)
	}
	if err != nil {
		return domain.User{}, err
	}
	created.PasswordHash = ""
	return created, nil
}

func (u *AuthUsecase) signOAuthState(provider string) (string, error) {
	nonce := make([]byte, 24)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	payload, err := json.Marshal(oauthState{
		Provider: normalizeProvider(provider),
		Nonce:    base64.RawURLEncoding.EncodeToString(nonce),
		Expires:  time.Now().Add(oauthStateTTL).Unix(),
	})
	if err != nil {
		return "", err
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signature := u.signOAuthPayload(encodedPayload)
	return encodedPayload + "." + signature, nil
}

func (u *AuthUsecase) validOAuthState(provider, rawState string) bool {
	parts := strings.Split(rawState, ".")
	if len(parts) != 2 {
		return false
	}
	if !hmac.Equal([]byte(u.signOAuthPayload(parts[0])), []byte(parts[1])) {
		return false
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}

	var state oauthState
	if err := json.Unmarshal(payload, &state); err != nil {
		return false
	}

	return state.Provider == normalizeProvider(provider) &&
		state.Nonce != "" &&
		state.Expires >= time.Now().Unix()
}

func (u *AuthUsecase) signOAuthPayload(payload string) string {
	mac := hmac.New(sha256.New, u.jwt.Secret)
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func randomOAuthPasswordHash() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return password.Hash("oauth:" + base64.RawURLEncoding.EncodeToString(raw))
}

func oauthRedirect(baseURL string, values map[string]string) string {
	u, err := url.Parse(baseURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "/login"
	}

	fragment := url.Values{}
	for key, value := range values {
		fragment.Set(key, value)
	}
	u.Fragment = fragment.Encode()
	return u.String()
}

func normalizeProvider(provider string) string {
	return strings.ToLower(strings.TrimSpace(provider))
}

func decodeJSONResponse(res *http.Response, dst any) error {
	defer res.Body.Close()
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("oauth profile request failed: %s", res.Status)
	}
	return json.NewDecoder(res.Body).Decode(dst)
}
