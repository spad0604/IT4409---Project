package domain

import "time"

// ─── Sprint Status Constants ────────────────────────────────────────────────

const (
	SprintStatusPlanning  = "planning"
	SprintStatusActive    = "active"
	SprintStatusCompleted = "completed"
)

// ValidSprintStatus returns true if s is one of the allowed sprint statuses.
func ValidSprintStatus(s string) bool {
	switch s {
	case SprintStatusPlanning, SprintStatusActive, SprintStatusCompleted:
		return true
	}
	return false
}

// ─── Sprint Entity ──────────────────────────────────────────────────────────

type Sprint struct {
	ID        string     `json:"id"`
	ProjectID string     `json:"projectId"`
	Name      string     `json:"name"`
	Goal      string     `json:"goal"`
	Status    string     `json:"status"`
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"`
	CreatedBy string     `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// ─── Sprint Patch (partial update) ──────────────────────────────────────────

type SprintPatch struct {
	Name      *string    `json:"name"`
	Goal      *string    `json:"goal"`
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"`
}
