package usecase

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
	"it4409/internal/repository"
)

type IssueUsecase struct {
	issueRepo    repository.IssueRepository
	projectRepo  repository.ProjectRepository
	txManager    repository.TxManager
	perm         *PermissionChecker
	activityRepo repository.ActivityRepository
	events       EventPublisher
}

func NewIssueUsecase(
	issueRepo repository.IssueRepository,
	projectRepo repository.ProjectRepository,
	txManager repository.TxManager,
	perm *PermissionChecker,
	activityRepo repository.ActivityRepository,
	events EventPublisher,
) *IssueUsecase {
	return &IssueUsecase{
		issueRepo:    issueRepo,
		projectRepo:  projectRepo,
		txManager:    txManager,
		perm:         perm,
		activityRepo: activityRepo,
		events:       events,
	}
}

// logActivity is a best-effort helper — failure to log does not fail the operation.
func (uc *IssueUsecase) logActivity(ctx context.Context, issueID, userID, action, field, oldVal, newVal string) {
	if uc.activityRepo == nil {
		return
	}
	err := uc.activityRepo.Create(ctx, &domain.Activity{
		IssueID:  issueID,
		UserID:   userID,
		Action:   action,
		Field:    field,
		OldValue: oldVal,
		NewValue: newVal,
	})
	if err != nil {
		log.Printf("[WARN] failed to log activity: %v", err)
	}
}

func (uc *IssueUsecase) publishIssueEvent(issue *domain.Issue, action string) {
	if uc.events == nil || issue == nil {
		return
	}
	uc.events.Publish("issue_updated", map[string]any{
		"projectId": issue.ProjectID,
		"issueId":   issue.ID,
		"issueKey":  issue.Key,
		"action":    action,
	})
}

// ─── Input Types ────────────────────────────────────────────────────────────

type CreateIssueInput struct {
	Type        string  `json:"type"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	AssigneeID  *string `json:"assigneeId"`
	ParentID    *string `json:"parentId"`
	SprintID    *string `json:"sprintId"`
}

// ─── Create Issue ───────────────────────────────────────────────────────────

func (uc *IssueUsecase) CreateIssue(ctx context.Context, userID, projectID string, input CreateIssueInput) (*domain.Issue, error) {
	// 1. Kiểm tra quyền: phải là member+
	if err := uc.perm.Check(ctx, projectID, userID, "member"); err != nil {
		return nil, err
	}

	// 2. Validate input
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrInvalidInput)
	}

	issueType := input.Type
	if issueType == "" {
		issueType = domain.IssueTypeTask
	}
	if !domain.ValidIssueType(issueType) {
		return nil, fmt.Errorf("%w: invalid issue type", domain.ErrInvalidInput)
	}

	priority := input.Priority
	if priority == "" {
		priority = domain.PriorityMedium
	}
	if !domain.ValidPriority(priority) {
		return nil, fmt.Errorf("%w: invalid priority", domain.ErrInvalidInput)
	}

	// 3. Lấy project.Key để ghép issue_key
	project, err := uc.projectRepo.GetByID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	// 4. Dùng transaction: atomic increment counter + insert issue
	var created *domain.Issue
	err = uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		num, err := uc.issueRepo.NextIssueNumberTx(ctx, tx, projectID)
		if err != nil {
			return err
		}

		issueKey := fmt.Sprintf("%s-%d", project.Key, num)

		issue := &domain.Issue{
			ProjectID:   projectID,
			IssueNumber: num,
			Key:         issueKey,
			Type:        issueType,
			Status:      domain.IssueStatusTodo,
			Priority:    priority,
			Title:       title,
			Description: input.Description,
			AssigneeID:  input.AssigneeID,
			ReporterID:  userID,
			ParentID:    input.ParentID,
			SprintID:    input.SprintID,
		}

		created, err = uc.issueRepo.CreateTx(ctx, tx, issue)
		return err
	})

	if err != nil {
		return nil, err
	}

	uc.logActivity(ctx, created.ID, userID, domain.ActivityCreated, "", "", "")
	uc.publishIssueEvent(created, domain.ActivityCreated)

	return created, nil
}

// ─── Get Issue ──────────────────────────────────────────────────────────────

func (uc *IssueUsecase) GetIssue(ctx context.Context, userID, issueKey string) (*domain.Issue, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return issue, nil
}

// ─── List Issues ────────────────────────────────────────────────────────────

func (uc *IssueUsecase) ListIssues(ctx context.Context, userID, projectID string, filter domain.IssueFilter) ([]*domain.Issue, int64, error) {
	if err := uc.perm.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, 0, err
	}

	// Handle "me" shorthand cho assignee filter
	if strings.EqualFold(filter.AssigneeID, "me") {
		filter.AssigneeID = userID
	}

	return uc.issueRepo.List(ctx, projectID, filter)
}

// ─── Update Issue ───────────────────────────────────────────────────────────

func (uc *IssueUsecase) UpdateIssue(ctx context.Context, userID, issueKey string, patch *domain.IssuePatch) (*domain.Issue, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "member"); err != nil {
		return nil, err
	}

	// Validate nếu có thay đổi type/priority
	if patch.Type != nil && !domain.ValidIssueType(*patch.Type) {
		return nil, fmt.Errorf("%w: invalid issue type", domain.ErrInvalidInput)
	}
	if patch.Priority != nil && !domain.ValidPriority(*patch.Priority) {
		return nil, fmt.Errorf("%w: invalid priority", domain.ErrInvalidInput)
	}

	updated, err := uc.issueRepo.Update(ctx, issue.ID, patch)
	if err != nil {
		return nil, err
	}

	uc.logIssueUpdates(ctx, userID, issue, updated, patch)
	uc.publishIssueEvent(updated, domain.ActivityUpdated)

	return updated, nil
}

// ─── Delete Issue ───────────────────────────────────────────────────────────

func (uc *IssueUsecase) DeleteIssue(ctx context.Context, userID, issueKey string) error {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return err
	}

	// Chỉ reporter, assignee, hoặc project admin mới được xóa
	isOwner := uc.perm.IsOwner(userID, issue.ReporterID)
	isAdmin := uc.perm.Check(ctx, issue.ProjectID, userID, "admin") == nil

	if !isOwner && !isAdmin {
		if err := uc.perm.Check(ctx, issue.ProjectID, userID, "member"); err != nil {
			return err
		}
		// member nhưng không phải reporter → forbidden
		return fmt.Errorf("%w: only reporter or admin can delete", domain.ErrForbidden)
	}

	if err := uc.issueRepo.SoftDelete(ctx, issue.ID); err != nil {
		return err
	}

	uc.logActivity(ctx, issue.ID, userID, domain.ActivityDeleted, "", "", "")
	uc.publishIssueEvent(issue, domain.ActivityDeleted)

	return nil
}

// ─── Change Status ──────────────────────────────────────────────────────────

func (uc *IssueUsecase) ChangeStatus(ctx context.Context, userID, issueKey, newStatus string) (*domain.Issue, error) {
	if !domain.ValidIssueStatus(newStatus) {
		return nil, fmt.Errorf("%w: invalid status", domain.ErrInvalidInput)
	}

	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "member"); err != nil {
		return nil, err
	}

	oldStatus := issue.Status
	updated, err := uc.issueRepo.UpdateStatus(ctx, issue.ID, newStatus)
	if err != nil {
		return nil, err
	}

	uc.logActivity(ctx, issue.ID, userID, domain.ActivityStatusChanged, "status", oldStatus, newStatus)
	uc.publishIssueEvent(updated, domain.ActivityStatusChanged)

	return updated, nil
}

// ─── Assign Issue ───────────────────────────────────────────────────────────

func (uc *IssueUsecase) AssignIssue(ctx context.Context, userID, issueKey string, assigneeID *string) (*domain.Issue, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "member"); err != nil {
		return nil, err
	}

	oldAssignee := ""
	if issue.AssigneeID != nil {
		oldAssignee = *issue.AssigneeID
	}
	newAssignee := ""
	if assigneeID != nil {
		newAssignee = *assigneeID
	}

	updated, err := uc.issueRepo.UpdateAssignee(ctx, issue.ID, assigneeID)
	if err != nil {
		return nil, err
	}

	uc.logActivity(ctx, issue.ID, userID, domain.ActivityAssigned, "assignee", oldAssignee, newAssignee)
	uc.publishIssueEvent(updated, domain.ActivityAssigned)

	return updated, nil
}

// ─── List Subtasks ──────────────────────────────────────────────────────────

func (uc *IssueUsecase) ListSubtasks(ctx context.Context, userID, issueKey string) ([]*domain.Issue, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "viewer"); err != nil {
		return nil, err
	}

	return uc.issueRepo.ListSubtasks(ctx, issue.ID)
}

func (uc *IssueUsecase) logIssueUpdates(ctx context.Context, userID string, before, after *domain.Issue, patch *domain.IssuePatch) {
	if before == nil || after == nil || patch == nil {
		return
	}

	logIfChanged := func(field, oldVal, newVal string) {
		if oldVal != newVal {
			uc.logActivity(ctx, after.ID, userID, domain.ActivityUpdated, field, oldVal, newVal)
		}
	}

	if patch.Title != nil {
		logIfChanged("title", before.Title, after.Title)
	}
	if patch.Description != nil {
		logIfChanged("description", before.Description, after.Description)
	}
	if patch.Type != nil {
		logIfChanged("type", before.Type, after.Type)
	}
	if patch.Priority != nil {
		logIfChanged("priority", before.Priority, after.Priority)
	}
	if patch.AssigneeIDSet {
		logIfChanged("assignee", optionalString(before.AssigneeID), optionalString(after.AssigneeID))
	}
	if patch.ParentIDSet {
		logIfChanged("parent", optionalString(before.ParentID), optionalString(after.ParentID))
	}
	if patch.SprintIDSet {
		logIfChanged("sprint", optionalString(before.SprintID), optionalString(after.SprintID))
	}
	if patch.DueDateSet {
		logIfChanged("due_date", optionalTime(before.DueDate), optionalTime(after.DueDate))
	}
	if patch.SortOrder != nil {
		logIfChanged(
			"sort_order",
			strconv.FormatFloat(before.SortOrder, 'f', -1, 64),
			strconv.FormatFloat(after.SortOrder, 'f', -1, 64),
		)
	}
}

func optionalString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func optionalTime(v *time.Time) string {
	if v == nil {
		return ""
	}
	return v.UTC().Format(time.RFC3339)
}
