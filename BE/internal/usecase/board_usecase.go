package usecase

import (
	"context"

	"github.com/jackc/pgx/v5"
	"it4409/internal/domain"
	"it4409/internal/repository"
)

type BoardUsecase struct {
	boardRepo   repository.BoardRepository
	projectRepo repository.ProjectRepository
	txManager   repository.TxManager
	permChecker *PermissionChecker
}

func NewBoardUsecase(
	boardRepo repository.BoardRepository,
	projectRepo repository.ProjectRepository,
	txManager repository.TxManager,
	permChecker *PermissionChecker,
) *BoardUsecase {
	return &BoardUsecase{
		boardRepo:   boardRepo,
		projectRepo: projectRepo,
		txManager:   txManager,
		permChecker: permChecker,
	}
}

// CreateBoard tạo một bảng mới trong dự án.
// SỬ DỤNG TRANSACTION GỘP: Tạo bảng + Tạo 4 cột mặc định (To Do, In Progress, In Review, Done).
func (uc *BoardUsecase) CreateBoard(ctx context.Context, userID, projectID string, name string) (*domain.Board, error) {
	// BẢO MẬT: Chỉ thành viên (member trở lên) mới được tạo bảng
	if err := uc.permChecker.Check(ctx, projectID, userID, "member"); err != nil {
		return nil, err
	}

	var created *domain.Board
	err := uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		created, err = uc.boardRepo.CreateTx(ctx, tx, &domain.Board{
			ProjectID: projectID,
			Name:      name,
			IsDefault: false,
		})
		if err != nil {
			return err
		}

		// Tự động tạo 4 cột mặc định cho bảng mới
		defaultColumns := []struct {
			Name      string
			StatusMap string
		}{
			{"To Do", "todo"},
			{"In Progress", "in_progress"},
			{"In Review", "in_review"},
			{"Done", "done"},
		}
		for i, col := range defaultColumns {
			_, err := uc.boardRepo.CreateColumnTx(ctx, tx, &domain.BoardColumn{
				BoardID:   created.ID,
				Name:      col.Name,
				Position:  i,
				StatusMap: col.StatusMap,
			})
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

// CreateDefaultBoard tạo bảng mặc định kèm 4 cột khi dự án mới được tạo.
// Hàm này được gọi từ ProjectUsecase bên trong Transaction tạo dự án.
func (uc *BoardUsecase) CreateDefaultBoardTx(ctx context.Context, tx pgx.Tx, projectID string) error {
	board, err := uc.boardRepo.CreateTx(ctx, tx, &domain.Board{
		ProjectID: projectID,
		Name:      "Main Board",
		IsDefault: true,
	})
	if err != nil {
		return err
	}

	defaultColumns := []struct {
		Name      string
		StatusMap string
	}{
		{"To Do", "todo"},
		{"In Progress", "in_progress"},
		{"In Review", "in_review"},
		{"Done", "done"},
	}
	for i, col := range defaultColumns {
		_, err := uc.boardRepo.CreateColumnTx(ctx, tx, &domain.BoardColumn{
			BoardID:   board.ID,
			Name:      col.Name,
			Position:  i,
			StatusMap: col.StatusMap,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (uc *BoardUsecase) ListBoards(ctx context.Context, userID, projectID string) ([]*domain.Board, error) {
	if err := uc.permChecker.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, err
	}
	return uc.boardRepo.ListByProject(ctx, projectID)
}

func (uc *BoardUsecase) GetBoard(ctx context.Context, userID, boardID string) (*domain.Board, []*domain.BoardColumn, error) {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return nil, nil, err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "viewer"); err != nil {
		return nil, nil, err
	}

	board, err := uc.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, nil, err
	}
	cols, err := uc.boardRepo.GetColumns(ctx, boardID)
	if err != nil {
		return nil, nil, err
	}
	return board, cols, nil
}

func (uc *BoardUsecase) UpdateBoard(ctx context.Context, userID, boardID string, patch *domain.BoardPatch) (*domain.Board, error) {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return nil, err
	}
	// BẢO MẬT: Chỉ admin mới được sửa bảng
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}
	return uc.boardRepo.Update(ctx, boardID, patch)
}

func (uc *BoardUsecase) DeleteBoard(ctx context.Context, userID, boardID string) error {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return err
	}
	return uc.boardRepo.Delete(ctx, boardID)
}

// === Thao tác với cột ===

func (uc *BoardUsecase) AddColumn(ctx context.Context, userID, boardID string, col *domain.BoardColumn) (*domain.BoardColumn, error) {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return nil, err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}

	col.BoardID = boardID
	var created *domain.BoardColumn
	err = uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
		var txErr error
		created, txErr = uc.boardRepo.CreateColumnTx(ctx, tx, col)
		return txErr
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (uc *BoardUsecase) UpdateColumn(ctx context.Context, userID, boardID, colID string, patch *domain.BoardColumnPatch) (*domain.BoardColumn, error) {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return nil, err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return nil, err
	}
	return uc.boardRepo.UpdateColumn(ctx, colID, patch)
}

func (uc *BoardUsecase) DeleteColumn(ctx context.Context, userID, boardID, colID string) error {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "admin"); err != nil {
		return err
	}
	return uc.boardRepo.DeleteColumn(ctx, colID)
}

// ReorderColumns cập nhật thứ tự các cột khi Frontend gửi request kéo thả.
func (uc *BoardUsecase) ReorderColumns(ctx context.Context, userID, boardID string, columnIDs []string) error {
	projectID, err := uc.boardRepo.GetProjectIDByBoardID(ctx, boardID)
	if err != nil {
		return err
	}
	if err := uc.permChecker.Check(ctx, projectID, userID, "member"); err != nil {
		return err
	}
	return uc.boardRepo.ReorderColumns(ctx, boardID, columnIDs)
}
