package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

type IssueRepo struct {
	pool *pgxpool.Pool
}

func NewIssueRepo(pool *pgxpool.Pool) *IssueRepo {
	return &IssueRepo{pool: pool}
}

// issueColumns là danh sách cột dùng chung cho SELECT.
const issueColumns = `id, project_id, issue_number, key, type, status, priority, title, description,
	assignee_id, reporter_id, parent_id, sprint_id, sort_order, due_date, created_at, updated_at`

func scanIssue(row pgx.Row) (*domain.Issue, error) {
	i := &domain.Issue{}
	err := row.Scan(
		&i.ID, &i.ProjectID, &i.IssueNumber, &i.Key, &i.Type, &i.Status, &i.Priority,
		&i.Title, &i.Description, &i.AssigneeID, &i.ReporterID, &i.ParentID, &i.SprintID,
		&i.SortOrder, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return i, nil
}

// ─── Transaction Methods ────────────────────────────────────────────────────

func (r *IssueRepo) NextIssueNumberTx(ctx context.Context, tx pgx.Tx, projectID string) (int, error) {
	const q = `
		UPDATE public.project_issue_counters
		SET last_number = last_number + 1
		WHERE project_id = $1
		RETURNING last_number
	`
	var num int
	err := tx.QueryRow(ctx, q, projectID).Scan(&num)
	if err != nil {
		return 0, err
	}
	return num, nil
}

func (r *IssueRepo) CreateTx(ctx context.Context, tx pgx.Tx, issue *domain.Issue) (*domain.Issue, error) {
	const q = `
		INSERT INTO public.issues (project_id, issue_number, key, type, status, priority, title, description,
			assignee_id, reporter_id, parent_id, sprint_id, sort_order, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING ` + issueColumns

	row := tx.QueryRow(ctx, q,
		issue.ProjectID, issue.IssueNumber, issue.Key, issue.Type, issue.Status, issue.Priority,
		issue.Title, issue.Description, issue.AssigneeID, issue.ReporterID, issue.ParentID,
		issue.SprintID, issue.SortOrder, issue.DueDate,
	)
	return scanIssue(row)
}

// ─── Read Methods ───────────────────────────────────────────────────────────

func (r *IssueRepo) GetByID(ctx context.Context, id string) (*domain.Issue, error) {
	q := `SELECT ` + issueColumns + ` FROM public.issues WHERE id = $1 AND deleted_at IS NULL`
	return scanIssue(r.pool.QueryRow(ctx, q, id))
}

func (r *IssueRepo) GetByKey(ctx context.Context, key string) (*domain.Issue, error) {
	q := `SELECT ` + issueColumns + ` FROM public.issues WHERE key = $1 AND deleted_at IS NULL`
	return scanIssue(r.pool.QueryRow(ctx, q, key))
}

func (r *IssueRepo) List(ctx context.Context, projectID string, filter domain.IssueFilter) ([]*domain.Issue, int64, error) {
	// Xây query động dựa trên filter
	where := []string{"project_id = $1", "deleted_at IS NULL"}
	args := []any{projectID}
	argIdx := 2

	if filter.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Type != "" {
		where = append(where, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, filter.Type)
		argIdx++
	}
	if filter.Priority != "" {
		where = append(where, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, filter.Priority)
		argIdx++
	}
	if filter.AssigneeID != "" {
		if filter.AssigneeID == "none" {
			where = append(where, "assignee_id IS NULL")
		} else {
			where = append(where, fmt.Sprintf("assignee_id = $%d", argIdx))
			args = append(args, filter.AssigneeID)
			argIdx++
		}
	}
	if filter.ReporterID != "" {
		where = append(where, fmt.Sprintf("reporter_id = $%d", argIdx))
		args = append(args, filter.ReporterID)
		argIdx++
	}
	if filter.SprintID != "" {
		if filter.SprintID == "backlog" {
			where = append(where, "sprint_id IS NULL")
		} else {
			where = append(where, fmt.Sprintf("sprint_id = $%d", argIdx))
			args = append(args, filter.SprintID)
			argIdx++
		}
	}
	if filter.ParentID != "" {
		where = append(where, fmt.Sprintf("parent_id = $%d", argIdx))
		args = append(args, filter.ParentID)
		argIdx++
	}
	if filter.Search != "" {
		where = append(where, fmt.Sprintf("title ILIKE '%%' || $%d || '%%'", argIdx))
		args = append(args, filter.Search)
		argIdx++
	}
	if filter.LabelID != "" {
		where = append(where, fmt.Sprintf(
			`id IN (SELECT issue_id FROM public.issue_labels WHERE label_id = $%d)`,
			argIdx,
		))
		args = append(args, filter.LabelID)
		argIdx++
	}

	whereClause := strings.Join(where, " AND ")

	// Sort
	sortCol := "created_at"
	switch filter.Sort {
	case "priority", "status", "due_date", "issue_number", "updated_at", "sort_order":
		sortCol = filter.Sort
	}
	order := "DESC"
	if strings.EqualFold(filter.Order, "asc") {
		order = "ASC"
	}

	// Pagination
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 50
	}
	if perPage > 100 {
		perPage = 100
	}
	page := filter.Page
	if page < 0 {
		page = 0
	}
	offset := page * perPage

	// Count query
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM public.issues WHERE %s`, whereClause)
	var total int64
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data query
	dataQ := fmt.Sprintf(`SELECT %s FROM public.issues WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		issueColumns, whereClause, sortCol, order, argIdx, argIdx+1)
	args = append(args, perPage, offset)

	rows, err := r.pool.Query(ctx, dataQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var issues []*domain.Issue
	for rows.Next() {
		i := &domain.Issue{}
		if err := rows.Scan(
			&i.ID, &i.ProjectID, &i.IssueNumber, &i.Key, &i.Type, &i.Status, &i.Priority,
			&i.Title, &i.Description, &i.AssigneeID, &i.ReporterID, &i.ParentID, &i.SprintID,
			&i.SortOrder, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		issues = append(issues, i)
	}
	return issues, total, rows.Err()
}

// ─── Write Methods ──────────────────────────────────────────────────────────

func (r *IssueRepo) Update(ctx context.Context, id string, patch *domain.IssuePatch) (*domain.Issue, error) {
	const q = `
		UPDATE public.issues
		SET title       = COALESCE($2, title),
			description = COALESCE($3, description),
			type        = COALESCE($4, type),
			priority    = COALESCE($5, priority),
			assignee_id = COALESCE($6, assignee_id),
			parent_id   = COALESCE($7, parent_id),
			sprint_id   = COALESCE($8, sprint_id),
			sort_order  = COALESCE($9, sort_order),
			due_date    = COALESCE($10, due_date)
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING ` + issueColumns

	return scanIssue(r.pool.QueryRow(ctx, q, id,
		patch.Title, patch.Description, patch.Type, patch.Priority,
		patch.AssigneeID, patch.ParentID, patch.SprintID, patch.SortOrder, patch.DueDate,
	))
}

func (r *IssueRepo) SoftDelete(ctx context.Context, id string) error {
	const q = `UPDATE public.issues SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`
	cmd, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *IssueRepo) UpdateStatus(ctx context.Context, id string, status string) (*domain.Issue, error) {
	q := `UPDATE public.issues SET status = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING ` + issueColumns
	return scanIssue(r.pool.QueryRow(ctx, q, id, status))
}

func (r *IssueRepo) UpdateAssignee(ctx context.Context, id string, assigneeID *string) (*domain.Issue, error) {
	q := `UPDATE public.issues SET assignee_id = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING ` + issueColumns
	return scanIssue(r.pool.QueryRow(ctx, q, id, assigneeID))
}

func (r *IssueRepo) ListSubtasks(ctx context.Context, parentID string) ([]*domain.Issue, error) {
	q := `SELECT ` + issueColumns + ` FROM public.issues WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC`
	rows, err := r.pool.Query(ctx, q, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []*domain.Issue
	for rows.Next() {
		i := &domain.Issue{}
		if err := rows.Scan(
			&i.ID, &i.ProjectID, &i.IssueNumber, &i.Key, &i.Type, &i.Status, &i.Priority,
			&i.Title, &i.Description, &i.AssigneeID, &i.ReporterID, &i.ParentID, &i.SprintID,
			&i.SortOrder, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		issues = append(issues, i)
	}
	return issues, rows.Err()
}

// ClearSprintID sets sprint_id = NULL for all undone issues belonging to the given sprint.
// Called when completing a sprint to move incomplete issues back to backlog.
func (r *IssueRepo) ClearSprintID(ctx context.Context, sprintID string) error {
	const q = `UPDATE public.issues SET sprint_id = NULL WHERE sprint_id = $1 AND status != 'done' AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, sprintID)
	return err
}
