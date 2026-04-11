package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"it4409/internal/domain"
)

// ProjectRepo KHÔNG chứa logic nghiệp vụ hay phân quyền (không if/else role).
// File này CHỈ chịu trách nhiệm thiết lập các câu truy vấn SQL (INSERT, SELECT...) để chọc thẳng vào CSDL.
type ProjectRepo struct {
	pool *pgxpool.Pool
}

func NewProjectRepo(pool *pgxpool.Pool) *ProjectRepo {
	return &ProjectRepo{pool: pool}
}

func (r *ProjectRepo) CreateTx(ctx context.Context, tx pgx.Tx, project *domain.Project) (*domain.Project, error) {
	query := `
		INSERT INTO public.projects (name, key, description, lead_id, icon, type, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, key, description, lead_id, icon, type, created_by, created_at, updated_at
	`
	err := tx.QueryRow(ctx, query,
		project.Name, project.Key, project.Description, project.LeadID,
		project.Icon, project.Type, project.CreatedBy,
	).Scan(
		&project.ID, &project.Name, &project.Key, &project.Description, &project.LeadID,
		&project.Icon, &project.Type, &project.CreatedBy, &project.CreatedAt, &project.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return project, nil
}

func (r *ProjectRepo) InitCounterTx(ctx context.Context, tx pgx.Tx, projectID string) error {
	query := `INSERT INTO public.project_issue_counters (project_id, last_number) VALUES ($1, 0)`
	_, err := tx.Exec(ctx, query, projectID)
	return err
}

func (r *ProjectRepo) AddMemberTx(ctx context.Context, tx pgx.Tx, member *domain.ProjectMember) error {
	query := `
		INSERT INTO public.project_members (project_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING joined_at
	`
	err := tx.QueryRow(ctx, query, member.ProjectID, member.UserID, member.Role).Scan(&member.JoinedAt)
	return err
}

// Bên dưới là các thao tác đọc và hành động đơn lẻ không yêu cầu Transaction nguyên tử
func (r *ProjectRepo) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	query := `
		SELECT id, name, key, description, lead_id, icon, type, created_by, created_at, updated_at, deleted_at
		FROM public.projects
		WHERE id = $1 AND deleted_at IS NULL
	`
	p := &domain.Project{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Key, &p.Description, &p.LeadID, &p.Icon, &p.Type,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepo) List(ctx context.Context, userID string) ([]*domain.Project, error) {
	query := `
		SELECT p.id, p.name, p.key, p.description, p.lead_id, p.icon, p.type, p.created_by, p.created_at, p.updated_at
		FROM public.projects p
		INNER JOIN public.project_members pm ON p.id = pm.project_id
		WHERE pm.user_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*domain.Project
	for rows.Next() {
		p := &domain.Project{}
		err := rows.Scan(
			&p.ID, &p.Name, &p.Key, &p.Description, &p.LeadID, &p.Icon, &p.Type,
			&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepo) Update(ctx context.Context, id string, patch *domain.ProjectPatch) (*domain.Project, error) {
	query := `
		UPDATE public.projects
		SET 
			name = COALESCE($2, name),
			key = COALESCE($3, key),
			description = COALESCE($4, description),
			lead_id = COALESCE($5, lead_id),
			icon = COALESCE($6, icon),
			updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, name, key, description, lead_id, icon, type, created_by, created_at, updated_at
	`
	p := &domain.Project{}
	err := r.pool.QueryRow(ctx, query, id, patch.Name, patch.Key, patch.Description, patch.LeadID, patch.Icon).Scan(
		&p.ID, &p.Name, &p.Key, &p.Description, &p.LeadID, &p.Icon, &p.Type,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepo) SoftDelete(ctx context.Context, id string) error {
	query := `UPDATE public.projects SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`
	cmd, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *ProjectRepo) RemoveMember(ctx context.Context, projectID, userID string) error {
	query := `DELETE FROM public.project_members WHERE project_id = $1 AND user_id = $2`
	cmd, err := r.pool.Exec(ctx, query, projectID, userID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *ProjectRepo) GetMembers(ctx context.Context, projectID string) ([]*domain.ProjectMember, error) {
	query := `
		SELECT project_id, user_id, role, joined_at
		FROM public.project_members
		WHERE project_id = $1
		ORDER BY joined_at ASC
	`
	rows, err := r.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.ProjectMember
	for rows.Next() {
		m := &domain.ProjectMember{}
		if err := rows.Scan(&m.ProjectID, &m.UserID, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *ProjectRepo) GetMemberRole(ctx context.Context, projectID, userID string) (string, error) {
	query := `SELECT role FROM public.project_members WHERE project_id = $1 AND user_id = $2`
	var role string
	err := r.pool.QueryRow(ctx, query, projectID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrNotFound
		}
		return "", err
	}
	return role, nil
}
