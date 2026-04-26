package usecase

import (
	"context"
	"fmt"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type CommentUsecase struct {
	commentRepo repository.CommentRepository
	issueRepo   repository.IssueRepository
	perm        *PermissionChecker
}

func NewCommentUsecase(
	commentRepo repository.CommentRepository,
	issueRepo repository.IssueRepository,
	perm *PermissionChecker,
) *CommentUsecase {
	return &CommentUsecase{
		commentRepo: commentRepo,
		issueRepo:   issueRepo,
		perm:        perm,
	}
}

// AddComment thêm bình luận vào issue. Yêu cầu member+ trong project.
func (uc *CommentUsecase) AddComment(ctx context.Context, userID, issueKey, content string) (*domain.Comment, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, fmt.Errorf("%w: comment content is required", domain.ErrInvalidInput)
	}

	// Lấy issue để xác định projectID cho permission check
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}

	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "member"); err != nil {
		return nil, err
	}

	comment := &domain.Comment{
		IssueID: issue.ID,
		UserID:  userID,
		Content: content,
	}
	return uc.commentRepo.Create(ctx, comment)
}

// ListComments liệt kê bình luận của issue. Yêu cầu viewer+ trong project.
func (uc *CommentUsecase) ListComments(ctx context.Context, userID, issueKey string, limit, offset int) ([]*domain.Comment, int64, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, 0, err
	}

	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "viewer"); err != nil {
		return nil, 0, err
	}

	return uc.commentRepo.List(ctx, issue.ID, limit, offset)
}

// EditComment sửa nội dung bình luận. Chỉ tác giả mới được sửa.
func (uc *CommentUsecase) EditComment(ctx context.Context, userID, commentID, content string) (*domain.Comment, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, fmt.Errorf("%w: comment content is required", domain.ErrInvalidInput)
	}

	comment, err := uc.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return nil, err
	}

	// Chỉ tác giả mới sửa được
	if !uc.perm.IsOwner(userID, comment.UserID) {
		return nil, fmt.Errorf("%w: only the author can edit this comment", domain.ErrForbidden)
	}

	return uc.commentRepo.Update(ctx, commentID, content)
}

// DeleteComment xóa bình luận. Tác giả hoặc project admin mới được xóa.
func (uc *CommentUsecase) DeleteComment(ctx context.Context, userID, commentID string) error {
	comment, err := uc.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	// Tác giả luôn được xóa comment của mình
	if uc.perm.IsOwner(userID, comment.UserID) {
		return uc.commentRepo.Delete(ctx, commentID)
	}

	// Nếu không phải tác giả, phải là admin của project chứa issue
	issue, err := uc.issueRepo.GetByID(ctx, comment.IssueID)
	if err != nil {
		return err
	}

	if err := uc.perm.Check(ctx, issue.ProjectID, userID, "admin"); err != nil {
		return fmt.Errorf("%w: only author or project admin can delete", domain.ErrForbidden)
	}

	return uc.commentRepo.Delete(ctx, commentID)
}
