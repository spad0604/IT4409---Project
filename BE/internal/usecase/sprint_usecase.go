package usecase

import (
	"context"
	"fmt"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type SprintUsecase struct {
	sprintRepo repository.SprintRepository
	issueRepo  repository.IssueRepository
	projectRepo repository.ProjectRepository
	txManager  repository.TxManager
	perm       *PermissionChecker
}

func NewSprintUsecase(
	sprintRepo repository.SprintRepository,
	issueRepo repository.IssueRepository,
	projectRepo repository.ProjectRepository,
	txManager repository.TxManager,
	perm *PermissionChecker,
) *SprintUsecase {
	return &SprintUsecase{
		sprintRepo:  sprintRepo,
		issueRepo:   issueRepo,
		projectRepo: projectRepo,
		txManager:   txManager,
		perm:        perm,
	}
}

// ─── Input Types ────────────────────────────────────────────────────────────

type CreateSprintInput struct {
	Name      string `json:"name"`
	Goal      string `json:"goal"`
}

// ─── Create Sprint ──────────────────────────────────────────────────────────

func (uc *SprintUsecase) CreateSprint(ctx context.Context, userID, projectID string, input CreateSprintInput) (*domain.Sprint, error) {
	if err := uc.perm.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, fmt.Errorf("%w: sprint name is required", domain.ErrInvalidInput)
	}

	sprint := &domain.Sprint{
		ProjectID: projectID,
		Name:      name,
		Goal:      strings.TrimSpace(input.Goal),
		Status:    domain.SprintStatusPlanning,
		CreatedBy: userID,
	}

	return uc.sprintRepo.Create(ctx, sprint)
}

// ─── Get Sprint ─────────────────────────────────────────────────────────────

func (uc *SprintUsecase) GetSprint(ctx context.Context, userID, sprintID string) (*domain.Sprint, error) {
	sprint, err := uc.sprintRepo.GetByID(ctx, sprintID)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, sprint.ProjectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return sprint, nil
}

// ─── List Sprints ───────────────────────────────────────────────────────────

func (uc *SprintUsecase) ListSprints(ctx context.Context, userID, projectID string) ([]*domain.Sprint, error) {
	if err := uc.perm.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return uc.sprintRepo.List(ctx, projectID)
}

// ─── Update Sprint ──────────────────────────────────────────────────────────

func (uc *SprintUsecase) UpdateSprint(ctx context.Context, userID, sprintID string, patch *domain.SprintPatch) (*domain.Sprint, error) {
	sprint, err := uc.sprintRepo.GetByID(ctx, sprintID)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, sprint.ProjectID, userID, "admin"); err != nil {
		return nil, err
	}
	return uc.sprintRepo.Update(ctx, sprintID, patch)
}

// ─── Start Sprint ───────────────────────────────────────────────────────────

func (uc *SprintUsecase) StartSprint(ctx context.Context, userID, sprintID string) (*domain.Sprint, error) {
	sprint, err := uc.sprintRepo.GetByID(ctx, sprintID)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, sprint.ProjectID, userID, "admin"); err != nil {
		return nil, err
	}

	if sprint.Status != domain.SprintStatusPlanning {
		return nil, fmt.Errorf("%w: sprint must be in planning status", domain.ErrInvalidInput)
	}

	// Kiểm tra: project chưa có sprint active khác
	hasActive, err := uc.sprintRepo.HasActiveSprint(ctx, sprint.ProjectID)
	if err != nil {
		return nil, err
	}
	if hasActive {
		return nil, domain.ErrSprintActive
	}

	return uc.sprintRepo.Start(ctx, sprintID)
}

// ─── Complete Sprint ────────────────────────────────────────────────────────

func (uc *SprintUsecase) CompleteSprint(ctx context.Context, userID, sprintID string) (*domain.Sprint, error) {
	sprint, err := uc.sprintRepo.GetByID(ctx, sprintID)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.Check(ctx, sprint.ProjectID, userID, "admin"); err != nil {
		return nil, err
	}

	if sprint.Status != domain.SprintStatusActive {
		return nil, domain.ErrSprintNotActive
	}

	// Complete sprint
	completed, err := uc.sprintRepo.Complete(ctx, sprintID)
	if err != nil {
		return nil, err
	}

	// Move undone issues to backlog (sprint_id = NULL)
	if err := uc.issueRepo.ClearSprintID(ctx, sprintID); err != nil {
		return nil, err
	}

	return completed, nil
}

// ─── Get Backlog ────────────────────────────────────────────────────────────

func (uc *SprintUsecase) GetBacklog(ctx context.Context, userID, projectID string) ([]*domain.Issue, error) {
	if err := uc.perm.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}

	filter := domain.IssueFilter{
		SprintID: "backlog", // issue_repo.go List() handles "backlog" → sprint_id IS NULL
		PerPage:  100,
		Sort:     "sort_order",
		Order:    "asc",
	}

	issues, _, err := uc.issueRepo.List(ctx, projectID, filter)
	return issues, err
}
