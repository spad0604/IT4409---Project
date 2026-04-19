package usecase

import (
	"context"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type LabelUsecase struct {
	labelRepo   repository.LabelRepository
	permChecker *PermissionChecker
}

func NewLabelUsecase(labelRepo repository.LabelRepository, permChecker *PermissionChecker) *LabelUsecase {
	return &LabelUsecase{
		labelRepo:   labelRepo,
		permChecker: permChecker,
	}
}

func (uc *LabelUsecase) CreateLabel(ctx context.Context, userID string, label *domain.Label) (*domain.Label, error) {
	// BẢO MẬT: Chỉ admin mới được tạo nhãn cho dự án
	if err := uc.permChecker.Check(ctx, label.ProjectID, userID, "admin"); err != nil {
		return nil, err
	}
	if label.Color == "" {
		label.Color = "#6366f1"
	}
	return uc.labelRepo.Create(ctx, label)
}

func (uc *LabelUsecase) ListLabels(ctx context.Context, userID, projectID string) ([]*domain.Label, error) {
	if err := uc.permChecker.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return uc.labelRepo.ListByProject(ctx, projectID)
}

func (uc *LabelUsecase) UpdateLabel(ctx context.Context, userID, labelID string, patch *domain.LabelPatch) (*domain.Label, error) {
	projectID, err := uc.labelRepo.GetProjectIDByLabelID(ctx, labelID)
	if err != nil {
		return nil, err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}
	return uc.labelRepo.Update(ctx, labelID, patch)
}

func (uc *LabelUsecase) DeleteLabel(ctx context.Context, userID, labelID string) error {
	projectID, err := uc.labelRepo.GetProjectIDByLabelID(ctx, labelID)
	if err != nil {
		return err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return err
	}
	return uc.labelRepo.Delete(ctx, labelID)
}

// === Gắn/gỡ nhãn vào công việc ===

func (uc *LabelUsecase) AttachToIssue(ctx context.Context, userID, issueID, labelID string) error {
	// Lấy projectID từ labelID để kiểm tra quyền
	projectID, err := uc.labelRepo.GetProjectIDByLabelID(ctx, labelID)
	if err != nil {
		return err
	}
	// BẢO MẬT: Chỉ member trở lên mới được gắn nhãn
	if err := uc.permChecker.Check(ctx, projectID, userID, "member"); err != nil {
		return err
	}
	return uc.labelRepo.AttachToIssue(ctx, issueID, labelID)
}

func (uc *LabelUsecase) DetachFromIssue(ctx context.Context, userID, issueID, labelID string) error {
	projectID, err := uc.labelRepo.GetProjectIDByLabelID(ctx, labelID)
	if err != nil {
		return err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "member"); err != nil {
		return err
	}
	return uc.labelRepo.DetachFromIssue(ctx, issueID, labelID)
}

func (uc *LabelUsecase) ListByIssue(ctx context.Context, issueID string) ([]*domain.Label, error) {
	return uc.labelRepo.ListByIssue(ctx, issueID)
}
