package usecase

import (
	"context"
	"fmt"
	"log"
	"strings"

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
}

func NewIssueUsecase(
	issueRepo repository.IssueRepository,
	projectRepo repository.ProjectRepository,
	txManager repository.TxManager,
	perm *PermissionChecker,
	activityRepo repository.ActivityRepository,
) *IssueUsecase {
	return &IssueUsecase{
		issueRepo:    issueRepo,
		projectRepo:  projectRepo,
		txManager:    txManager,
		perm:         perm,
		activityRepo: activityRepo,
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

	return uc.issueRepo.Update(ctx, issue.ID, patch)
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
