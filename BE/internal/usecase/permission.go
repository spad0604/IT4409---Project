package usecase

import (
	"context"
	"fmt"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type PermissionChecker struct {
	projectRepo repository.ProjectRepository
}

func NewPermissionChecker(projectRepo repository.ProjectRepository) *PermissionChecker {
	return &PermissionChecker{projectRepo: projectRepo}
}

// Check xác minh xem người dùng có đủ vai trò trong dự án hay không.
// Phân cấp vai trò: admin > member > viewer
func (pc *PermissionChecker) Check(ctx context.Context, projectID, userID, requiredRole string) error {
	actualRole, err := pc.projectRepo.GetMemberRole(ctx, projectID, userID)
	if err != nil {
		if err == domain.ErrNotFound {
			return fmt.Errorf("%w: user is not a member of this project", domain.ErrForbidden)
		}
		return err
	}

	if !isRoleSufficient(actualRole, requiredRole) {
		return fmt.Errorf("%w: requires %s role, but got %s", domain.ErrForbidden, requiredRole, actualRole)
	}

	return nil
}

// IsOwner kiểm tra xem userID gửi lên có phải là chủ sở hữu (ownerID) không.
func (pc *PermissionChecker) IsOwner(userID, ownerID string) bool {
	return userID == ownerID
}

func isRoleSufficient(actual, required string) bool {
	hierarchy := map[string]int{
		"viewer": 1,
		"member": 2,
		"admin":  3,
	}
	return hierarchy[actual] >= hierarchy[required]
}

// RequireMember kiểm tra user có ít nhất role member trong project.
func (pc *PermissionChecker) RequireMember(ctx context.Context, projectID, userID string) error {
	return pc.Check(ctx, projectID, userID, "member")
}
