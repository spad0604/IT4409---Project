package domain

import "time"

// ─── Issue Type Enum ────────────────────────────────────────────────────────

const (
	IssueTypeEpic    = "epic"
	IssueTypeStory   = "story"
	IssueTypeTask    = "task"
	IssueTypeBug     = "bug"
	IssueTypeSubtask = "subtask"
)

func ValidIssueType(t string) bool {
	switch t {
	case IssueTypeEpic, IssueTypeStory, IssueTypeTask, IssueTypeBug, IssueTypeSubtask:
		return true
	}
	return false
}

// ─── Issue Status Enum ──────────────────────────────────────────────────────

const (
	IssueStatusTodo       = "todo"
	IssueStatusInProgress = "in_progress"
	IssueStatusInReview   = "in_review"
	IssueStatusDone       = "done"
	IssueStatusCancelled  = "cancelled"
)

func ValidIssueStatus(s string) bool {
	switch s {
	case IssueStatusTodo, IssueStatusInProgress, IssueStatusInReview, IssueStatusDone, IssueStatusCancelled:
		return true
	}
	return false
}

// ─── Priority Enum ──────────────────────────────────────────────────────────

const (
	PriorityCritical = "critical"
	PriorityHigh     = "high"
	PriorityMedium   = "medium"
	PriorityLow      = "low"
	PriorityTrivial  = "trivial"
)

func ValidPriority(p string) bool {
	switch p {
	case PriorityCritical, PriorityHigh, PriorityMedium, PriorityLow, PriorityTrivial:
		return true
	}
	return false
}

// ─── Issue Entity ───────────────────────────────────────────────────────────

type Issue struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	IssueNumber int        `json:"issueNumber"`
	Key         string     `json:"key"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AssigneeID  *string    `json:"assigneeId"`
	ReporterID  string     `json:"reporterId"`
	ParentID    *string    `json:"parentId"`
	SprintID    *string    `json:"sprintId"`
	SortOrder   float64    `json:"sortOrder"`
	DueDate     *time.Time `json:"dueDate"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// ─── Issue Patch (partial update) ───────────────────────────────────────────

type IssuePatch struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Type        *string    `json:"type"`
	Priority    *string    `json:"priority"`
	AssigneeID  *string    `json:"assigneeId"`
	ParentID    *string    `json:"parentId"`
	SprintID    *string    `json:"sprintId"`
	SortOrder   *float64   `json:"sortOrder"`
	DueDate     *time.Time `json:"dueDate"`
}

// ─── Issue Filter (for list endpoint) ───────────────────────────────────────

type IssueFilter struct {
	Status     string
	Type       string
	Priority   string
	AssigneeID string
	SprintID   string
	ParentID   string
	Search     string
	Page       int
	PerPage    int
	Sort       string
	Order      string
}
