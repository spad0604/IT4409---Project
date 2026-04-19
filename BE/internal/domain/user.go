package domain

import "time"

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Name         string
	AvatarURL    string
	UpdatedAt    time.Time
	CreatedAt    time.Time
}
