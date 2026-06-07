package domain

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"
)

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

	AssigneeIDSet bool `json:"-"`
	ParentIDSet   bool `json:"-"`
	SprintIDSet   bool `json:"-"`
	DueDateSet    bool `json:"-"`
}

func (p *IssuePatch) UnmarshalJSON(data []byte) error {
	type scalarPatch struct {
		Title       *string  `json:"title"`
		Description *string  `json:"description"`
		Type        *string  `json:"type"`
		Priority    *string  `json:"priority"`
		SortOrder   *float64 `json:"sortOrder"`
	}

	var scalar scalarPatch
	if err := json.Unmarshal(data, &scalar); err != nil {
		return err
	}
	p.Title = scalar.Title
	p.Description = scalar.Description
	p.Type = scalar.Type
	p.Priority = scalar.Priority
	p.SortOrder = scalar.SortOrder

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	var err error
	p.AssigneeID, p.AssigneeIDSet, err = decodeNullableString(raw, "assigneeId")
	if err != nil {
		return err
	}
	p.ParentID, p.ParentIDSet, err = decodeNullableString(raw, "parentId")
	if err != nil {
		return err
	}
	p.SprintID, p.SprintIDSet, err = decodeNullableString(raw, "sprintId")
	if err != nil {
		return err
	}
	p.DueDate, p.DueDateSet, err = decodeNullableTime(raw, "dueDate")
	return err
}

func decodeNullableString(raw map[string]json.RawMessage, key string) (*string, bool, error) {
	value, ok := raw[key]
	if !ok {
		return nil, false, nil
	}
	if isJSONNull(value) {
		return nil, true, nil
	}

	var s string
	if err := json.Unmarshal(value, &s); err != nil {
		return nil, true, fmt.Errorf("%s must be string or null", key)
	}
	return &s, true, nil
}

func decodeNullableTime(raw map[string]json.RawMessage, key string) (*time.Time, bool, error) {
	value, ok := raw[key]
	if !ok {
		return nil, false, nil
	}
	if isJSONNull(value) {
		return nil, true, nil
	}

	var s string
	if err := json.Unmarshal(value, &s); err != nil {
		return nil, true, fmt.Errorf("%s must be date string or null", key)
	}
	if s == "" {
		return nil, true, nil
	}

	for _, layout := range []string{"2006-01-02", time.RFC3339Nano, time.RFC3339} {
		t, err := time.Parse(layout, s)
		if err == nil {
			return &t, true, nil
		}
	}

	return nil, true, fmt.Errorf("%s must be YYYY-MM-DD or RFC3339", key)
}

func isJSONNull(raw json.RawMessage) bool {
	return bytes.Equal(bytes.TrimSpace(raw), []byte("null"))
}

// ─── Issue Filter (for list endpoint) ───────────────────────────────────────

type IssueFilter struct {
	Status     string
	Type       string
	Priority   string
	AssigneeID string
	ReporterID string
	LabelID    string
	SprintID   string
	ParentID   string
	Search     string
	Page       int
	PerPage    int
	Sort       string
	Order      string
}
