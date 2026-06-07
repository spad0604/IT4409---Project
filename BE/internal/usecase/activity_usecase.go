package usecase

import (
	"context"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type ActivityUsecase struct {
	activityRepo repository.ActivityRepository
	issueRepo    repository.IssueRepository
	perm         *PermissionChecker
}

func NewActivityUsecase(
	activityRepo repository.ActivityRepository,
	issueRepo repository.IssueRepository,
	perm *PermissionChecker,
) *ActivityUsecase {
	return &ActivityUsecase{
		activityRepo: activityRepo,
		issueRepo:    issueRepo,
		perm:         perm,
	}
}

// GetIssueActivity returns the activity log for a specific issue.
func (uc *ActivityUsecase) GetIssueActivity(ctx context.Context, userID, issueKey string, limit, offset int) ([]*domain.Activity, int64, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, 0, err
	}
	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "viewer"); err != nil {
		return nil, 0, err
	}
	return uc.activityRepo.ListByIssue(ctx, issue.ID, limit, offset)
}

// GetProjectActivity returns the activity log for all issues in a project.
func (uc *ActivityUsecase) GetProjectActivity(ctx context.Context, userID, projectID string, limit, offset int) ([]*domain.Activity, int64, error) {
	if err := uc.perm.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, 0, err
	}
	return uc.activityRepo.ListByProject(ctx, projectID, limit, offset)
}
