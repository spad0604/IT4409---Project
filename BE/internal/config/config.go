package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	JWTIssuer     string
	JWTTTL        time.Duration
	TokenAudience string
}

func Load() (Config, error) {
	cfg := Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTIssuer:   getEnv("JWT_ISSUER", "it4409"),
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
