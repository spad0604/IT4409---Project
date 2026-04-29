package domain

import "time"

// ─── Activity Action Constants ──────────────────────────────────────────────

const (
	ActivityCreated       = "created"
	ActivityUpdated       = "updated"
	ActivityStatusChanged = "status_changed"
	ActivityAssigned      = "assigned"
	ActivityCommented     = "commented"
	ActivityDeleted       = "deleted"
)

// ─── Activity Entity ────────────────────────────────────────────────────────

// Activity represents a single change record in the activity log.
// Stored in the activity_log table — linked to an issue, not directly to a project.
// Project-level queries use JOIN through issues.project_id.
type Activity struct {
	ID        string    `json:"id"`
	IssueID   string    `json:"issueId"`
	UserID    string    `json:"userId"`
	Action    string    `json:"action"`
	Field     string    `json:"field"`
	OldValue  string    `json:"oldValue"`
	NewValue  string    `json:"newValue"`
	CreatedAt time.Time `json:"createdAt"`
}
