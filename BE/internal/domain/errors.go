package domain

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrConflict        = errors.New("conflict")
	ErrUnauthorized    = errors.New("unauthorized")
	ErrForbidden       = errors.New("forbidden")
	ErrInvalidInput    = errors.New("invalid input")
	ErrInternal        = errors.New("internal error")
	ErrSprintActive    = errors.New("another sprint is active")
	ErrSprintNotActive = errors.New("sprint is not active")
	ErrInvalidStatus   = errors.New("invalid status transition")
)
