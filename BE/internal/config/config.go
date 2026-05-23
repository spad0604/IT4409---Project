package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                     string
	DatabaseURL              string
	JWTSecret                string
	JWTIssuer                string
	JWTTTL                   time.Duration
	TokenAudience            string
	OAuthRedirectBaseURL     string
	FrontendOAuthCallbackURL string
	GoogleClientID           string
	GoogleClientSecret       string
	GitHubClientID           string
	GitHubClientSecret       string
}

func Load() (Config, error) {
	port := getEnv("PORT", "8080")
	frontendURL := strings.TrimRight(getEnv("FRONTEND_URL", "http://localhost:5173"), "/")
	cfg := Config{
		Port:                     port,
		DatabaseURL:              os.Getenv("DATABASE_URL"),
		JWTSecret:                os.Getenv("JWT_SECRET"),
		JWTIssuer:                getEnv("JWT_ISSUER", "it4409"),
		OAuthRedirectBaseURL:     strings.TrimRight(getEnv("OAUTH_REDIRECT_BASE_URL", "http://localhost:"+port), "/"),
		FrontendOAuthCallbackURL: getEnv("FRONTEND_OAUTH_CALLBACK_URL", frontendURL+"/oauth/callback"),
		GoogleClientID:           os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:       os.Getenv("GOOGLE_CLIENT_SECRET"),
		GitHubClientID:           os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret:       os.Getenv("GITHUB_CLIENT_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}

	ttlMinutesStr := getEnv("JWT_TTL_MINUTES", "10080")
	ttlMinutes, err := strconv.Atoi(ttlMinutesStr)
	if err != nil || ttlMinutes <= 0 {
		return Config{}, fmt.Errorf("JWT_TTL_MINUTES must be a positive integer")
	}
	cfg.JWTTTL = time.Duration(ttlMinutes) * time.Minute

	return cfg, nil
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}
