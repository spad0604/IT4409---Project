package usecase

import (
	"context"
	"fmt"
	"io"

	"it4409/internal/domain"
	"it4409/internal/infra/filestore"
	"it4409/internal/repository"
)

type AttachmentUsecase struct {
	attRepo   repository.AttachmentRepository
	issueRepo repository.IssueRepository
	perm      *PermissionChecker
	fs        *filestore.FileStore
}

func NewAttachmentUsecase(
	attRepo repository.AttachmentRepository,
	issueRepo repository.IssueRepository,
	perm *PermissionChecker,
	fs *filestore.FileStore,
) *AttachmentUsecase {
	return &AttachmentUsecase{attRepo: attRepo, issueRepo: issueRepo, perm: perm, fs: fs}
}

const maxFileSize = 10 << 20 // 10 MB

func (uc *AttachmentUsecase) Upload(ctx context.Context, userID, issueKey, filename, mimeType string, size int64, reader io.Reader) (*domain.Attachment, error) {
	if size > maxFileSize {
		return nil, fmt.Errorf("%w: file quá lớn (max 10MB)", domain.ErrInvalidInput)
	}

	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}

	if err := uc.perm.RequireMember(ctx, issue.ProjectID, userID); err != nil {
		return nil, err
	}

	storagePath, err := uc.fs.Save(filename, reader)
	if err != nil {
		return nil, fmt.Errorf("%w: cannot save file", domain.ErrInternal)
	}

	att := &domain.Attachment{
		IssueID:     issue.ID,
		UploadedBy:  userID,
		Filename:    filename,
		FileSize:    size,
		MimeType:    mimeType,
		StoragePath: storagePath,
	}

	return uc.attRepo.Create(ctx, att)
}

func (uc *AttachmentUsecase) List(ctx context.Context, userID, issueKey string) ([]*domain.Attachment, error) {
	issue, err := uc.issueRepo.GetByKey(ctx, issueKey)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.RequireMember(ctx, issue.ProjectID, userID); err != nil {
		return nil, err
	}
	return uc.attRepo.ListByIssue(ctx, issue.ID)
}

func (uc *AttachmentUsecase) GetByID(ctx context.Context, userID, attachmentID string) (*domain.Attachment, error) {
	att, err := uc.attRepo.GetByID(ctx, attachmentID)
	if err != nil {
		return nil, err
	}
	issue, err := uc.issueRepo.GetByID(ctx, att.IssueID)
	if err != nil {
		return nil, err
	}
	if err := uc.perm.RequireMember(ctx, issue.ProjectID, userID); err != nil {
		return nil, err
	}
	return att, nil
}

func (uc *AttachmentUsecase) Delete(ctx context.Context, userID, attachmentID string) error {
	att, err := uc.attRepo.GetByID(ctx, attachmentID)
	if err != nil {
		return err
	}
	issue, err := uc.issueRepo.GetByID(ctx, att.IssueID)
	if err != nil {
		return err
	}
	if err := uc.perm.RequireMember(ctx, issue.ProjectID, userID); err != nil {
		return err
	}
	if err := uc.attRepo.Delete(ctx, attachmentID); err != nil {
		return err
	}
	_ = uc.fs.Remove(att.StoragePath)
	return nil
}

func (uc *AttachmentUsecase) FilePath(storagePath string) string {
	return uc.fs.FullPath(storagePath)
}
