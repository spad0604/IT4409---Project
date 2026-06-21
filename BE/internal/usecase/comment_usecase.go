package usecase

import (
	"context"
	"fmt"
	"log"
	"strings"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type CommentUsecase struct {
	commentRepo  repository.CommentRepository
	issueRepo    repository.IssueRepository
	activityRepo repository.ActivityRepository
	perm         *PermissionChecker
	events       EventPublisher
}

func NewCommentUsecase(
	commentRepo repository.CommentRepository,
	issueRepo repository.IssueRepository,
	perm *PermissionChecker,
	activityRepo repository.ActivityRepository,
	events EventPublisher,
) *CommentUsecase {
	return &CommentUsecase{
		commentRepo:  commentRepo,
		issueRepo:    issueRepo,
		activityRepo: activityRepo,
		perm:         perm,
		events:       events,
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
	created, err := uc.commentRepo.Create(ctx, comment)
	if err != nil {
		return nil, err
	}

	uc.logCommentActivity(ctx, issue.ID, userID, content)
	uc.publishCommentAdded(issue, created)

	return created, nil
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

	updated, err := uc.commentRepo.Update(ctx, commentID, content)
	if err != nil {
		return nil, err
	}
	issue, err := uc.issueRepo.GetByID(ctx, comment.IssueID)
	if err == nil {
		uc.publishCommentEvent("comment_updated", issue, updated)
	}
	return updated, nil
}

// DeleteComment xóa bình luận. Tác giả hoặc project admin mới được xóa.
func (uc *CommentUsecase) DeleteComment(ctx context.Context, userID, commentID string) error {
	comment, err := uc.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	issue, err := uc.issueRepo.GetByID(ctx, comment.IssueID)
	if err != nil {
		return err
	}

	// Tác giả luôn được xóa comment của mình; người khác cần là project admin.
	if !uc.perm.IsOwner(userID, comment.UserID) {
		if err := uc.perm.Check(ctx, issue.ProjectID, userID, "admin"); err != nil {
			return fmt.Errorf("%w: only author or project admin can delete", domain.ErrForbidden)
		}
	}

	if err := uc.commentRepo.Delete(ctx, commentID); err != nil {
		return err
	}
	uc.publishCommentEvent("comment_deleted", issue, comment)
	return nil
}

func (uc *CommentUsecase) logCommentActivity(ctx context.Context, issueID, userID, content string) {
	if uc.activityRepo == nil {
		return
	}
	if runes := []rune(content); len(runes) > 200 {
		content = string(runes[:200])
	}
	err := uc.activityRepo.Create(ctx, &domain.Activity{
		IssueID:  issueID,
		UserID:   userID,
		Action:   domain.ActivityCommented,
		NewValue: content,
	})
	if err != nil {
		log.Printf("[WARN] failed to log comment activity: %v", err)
	}
}

func (uc *CommentUsecase) publishCommentAdded(issue *domain.Issue, comment *domain.Comment) {
	uc.publishCommentEvent("comment_added", issue, comment)
}

func (uc *CommentUsecase) publishCommentEvent(eventType string, issue *domain.Issue, comment *domain.Comment) {
	if uc.events == nil || issue == nil || comment == nil {
		return
	}
	uc.events.Publish(eventType, map[string]any{
		"projectId": issue.ProjectID,
		"issueId":   issue.ID,
		"issueKey":  issue.Key,
		"commentId": comment.ID,
	})
}
