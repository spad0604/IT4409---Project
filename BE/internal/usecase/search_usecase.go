package usecase

import (
	"context"

	"it4409/internal/domain"
	"it4409/internal/repository"
)

type SearchUsecase struct {
	issueRepo   repository.IssueRepository
	projectRepo repository.ProjectRepository
}

func NewSearchUsecase(issueRepo repository.IssueRepository, projectRepo repository.ProjectRepository) *SearchUsecase {
	return &SearchUsecase{issueRepo: issueRepo, projectRepo: projectRepo}
}

type SearchResult struct {
	Issues   []*domain.Issue   `json:"issues"`
	Projects []*domain.Project `json:"projects"`
}

func (uc *SearchUsecase) Search(ctx context.Context, userID, query, filterType, projectID string) (*SearchResult, error) {
	result := &SearchResult{}

	if filterType == "" || filterType == "issues" {
		filter := domain.IssueFilter{Search: query, PerPage: 20}
		if projectID != "" {
			issues, _, err := uc.issueRepo.List(ctx, projectID, filter)
			if err != nil {
				return nil, err
			}
			result.Issues = issues
		} else {
			// Tìm trong tất cả project user là member
			projects, err := uc.projectRepo.List(ctx, userID)
			if err != nil {
				return nil, err
			}
			for _, p := range projects {
				issues, _, err := uc.issueRepo.List(ctx, p.ID, filter)
				if err != nil {
					continue
				}
				result.Issues = append(result.Issues, issues...)
				if len(result.Issues) >= 20 {
					result.Issues = result.Issues[:20]
					break
				}
			}
		}
	}

	if filterType == "" || filterType == "projects" {
		projects, err := uc.projectRepo.List(ctx, userID)
		if err != nil {
			return nil, err
		}
		// Lọc theo keyword
		var matched []*domain.Project
		for _, p := range projects {
			if contains(p.Name, query) || contains(p.Key, query) || contains(p.Description, query) {
				matched = append(matched, p)
			}
		}
		result.Projects = matched
	}

	return result, nil
}

func contains(s, substr string) bool {
	if substr == "" {
		return true
	}
	return len(s) >= len(substr) && (s == substr || containsCI(s, substr))
}

func containsCI(s, substr string) bool {
	sl := len(s)
	subl := len(substr)
	for i := 0; i <= sl-subl; i++ {
		if equalFoldByte(s[i:i+subl], substr) {
			return true
		}
	}
	return false
}

func equalFoldByte(a, b string) bool {
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if ca >= 'A' && ca <= 'Z' {
			ca += 32
		}
		if cb >= 'A' && cb <= 'Z' {
			cb += 32
		}
		if ca != cb {
			return false
		}
	}
	return true
}
