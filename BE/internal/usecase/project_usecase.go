package usecase

import (
	"context"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
	"it4409/internal/repository"
)

type ProjectUsecase struct {
	projectRepo repository.ProjectRepository
	txManager   repository.TxManager
	permChecker *PermissionChecker
}

func NewProjectUsecase(repo repository.ProjectRepository, txManager repository.TxManager, permChecker *PermissionChecker) *ProjectUsecase {
	return &ProjectUsecase{
		projectRepo: repo,
		txManager:   txManager,
		permChecker: permChecker,
	}
}

func (uc *ProjectUsecase) CreateProject(ctx context.Context, userID string, proj *domain.Project) (*domain.Project, error) {
	proj.CreatedBy = userID
	if proj.Type == "" {
		proj.Type = "kanban"
	}

	var created *domain.Project
	// SỬ DỤNG TRANSACTION GỘP: Phải đồng thời tạo Dự án + Tạo Bộ đếm issue + Gán thành viên là Admin
	// Nếu một trong 3 cái lỗi, DB sẽ tự động khôi phục lại không bị rác (vd: có dự án mà không có admin)
	err := uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		created, err = uc.projectRepo.CreateTx(ctx, tx, proj)
		if err != nil {
			return err
		}

		err = uc.projectRepo.InitCounterTx(ctx, tx, created.ID)
		if err != nil {
			return err
		}

		err = uc.projectRepo.AddMemberTx(ctx, tx, &domain.ProjectMember{
			ProjectID: created.ID,
			UserID:    userID,
			Role:      "admin",
		})
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return created, nil
}

func (uc *ProjectUsecase) ListProjects(ctx context.Context, userID string) ([]*domain.Project, error) {
	return uc.projectRepo.List(ctx, userID)
}

func (uc *ProjectUsecase) GetProject(ctx context.Context, userID, projectID string) (*domain.Project, error) {
	if err := uc.permChecker.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return uc.projectRepo.GetByID(ctx, projectID)
}

func (uc *ProjectUsecase) UpdateProject(ctx context.Context, userID, projectID string, patch *domain.ProjectPatch) (*domain.Project, error) {
	// BẢO MẬT: Phải qua trạm kiểm soát Permission Checker, xác minh User gửi request đang giữ chức vụ "admin" ở dự án thì mới cho chạy Repo Update
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}
	return uc.projectRepo.Update(ctx, projectID, patch)
}

func (uc *ProjectUsecase) DeleteProject(ctx context.Context, userID, projectID string) error {
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return err
	}
	return uc.projectRepo.SoftDelete(ctx, projectID)
}

func (uc *ProjectUsecase) AddMember(ctx context.Context, adminID string, member *domain.ProjectMember) error {
	if err := uc.permChecker.Check(ctx, member.ProjectID, adminID, "admin"); err != nil {
		return err
	}
	return uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		return uc.projectRepo.AddMemberTx(ctx, tx, member)
	})
}

func (uc *ProjectUsecase) GetMembers(ctx context.Context, userID, projectID string) ([]*domain.ProjectMember, error) {
	if err := uc.permChecker.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return uc.projectRepo.GetMembers(ctx, projectID)
}

func (uc *ProjectUsecase) RemoveMember(ctx context.Context, adminID, projectID, targetUserID string) error {
	if err := uc.permChecker.Check(ctx, projectID, adminID, "admin"); err != nil {
		return err
	}
	return uc.projectRepo.RemoveMember(ctx, projectID, targetUserID)
}

func (uc *ProjectUsecase) ChangeRole(ctx context.Context, adminID, projectID, targetUserID, newRole string) error {
	if err := uc.permChecker.Check(ctx, projectID, adminID, "admin"); err != nil {
		return err
	}
	return uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		err := uc.projectRepo.RemoveMember(ctx, projectID, targetUserID)
		if err != nil {
			return err
		}
		return uc.projectRepo.AddMemberTx(ctx, tx, &domain.ProjectMember{
			ProjectID: projectID,
			UserID:    targetUserID,
			Role:      newRole,
		})
	})
}
