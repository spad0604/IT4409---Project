package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestIssuePatchUnmarshalTracksNullableFields(t *testing.T) {
	var patch IssuePatch
	err := json.Unmarshal([]byte(`{
		"assigneeId": "user-1",
		"parentId": null,
		"sprintId": null,
		"dueDate": "2026-05-23"
	}`), &patch)
	if err != nil {
		t.Fatalf("unmarshal issue patch: %v", err)
	}

	if !patch.AssigneeIDSet || patch.AssigneeID == nil || *patch.AssigneeID != "user-1" {
		t.Fatalf("assigneeId was not tracked as a set string")
	}
	if !patch.ParentIDSet || patch.ParentID != nil {
		t.Fatalf("parentId null was not tracked as a clear operation")
	}
	if !patch.SprintIDSet || patch.SprintID != nil {
		t.Fatalf("sprintId null was not tracked as a clear operation")
	}
	if !patch.DueDateSet || patch.DueDate == nil {
		t.Fatalf("dueDate was not tracked as set")
	}

	want := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
	if !patch.DueDate.Equal(want) {
		t.Fatalf("dueDate = %v, want %v", patch.DueDate, want)
	}
}

func TestIssuePatchUnmarshalLeavesAbsentNullableFieldsUnset(t *testing.T) {
	var patch IssuePatch
	err := json.Unmarshal([]byte(`{"title":"New title"}`), &patch)
	if err != nil {
		t.Fatalf("unmarshal issue patch: %v", err)
	}

	if patch.Title == nil || *patch.Title != "New title" {
		t.Fatalf("title was not parsed")
	}
	if patch.SprintIDSet || patch.AssigneeIDSet || patch.ParentIDSet || patch.DueDateSet {
		t.Fatalf("absent nullable fields should not be marked as set")
	}
}

func TestIssuePatchUnmarshalDueDateRFC3339AndNull(t *testing.T) {
	var rfcPatch IssuePatch
	err := json.Unmarshal([]byte(`{"dueDate":"2026-05-23T00:00:00Z"}`), &rfcPatch)
	if err != nil {
		t.Fatalf("unmarshal rfc3339 dueDate: %v", err)
	}
	if !rfcPatch.DueDateSet || rfcPatch.DueDate == nil {
		t.Fatalf("rfc3339 dueDate was not tracked as set")
	}
	want := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
	if !rfcPatch.DueDate.Equal(want) {
		t.Fatalf("dueDate = %v, want %v", rfcPatch.DueDate, want)
	}

	var nullPatch IssuePatch
	err = json.Unmarshal([]byte(`{"dueDate":null}`), &nullPatch)
	if err != nil {
		t.Fatalf("unmarshal null dueDate: %v", err)
	}
	if !nullPatch.DueDateSet || nullPatch.DueDate != nil {
		t.Fatalf("null dueDate was not tracked as a clear operation")
	}
}
