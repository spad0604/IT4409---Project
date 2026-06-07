-- Issues: công việc / task / bug / story / epic
CREATE TABLE IF NOT EXISTS public.issues (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    issue_number INTEGER NOT NULL,
    key          TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'task'
                   CHECK (type IN ('epic','story','task','bug','subtask')),
    status       TEXT NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
    priority     TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('critical','high','medium','low','trivial')),
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    assignee_id  UUID REFERENCES public.users(id),
    reporter_id  UUID NOT NULL REFERENCES public.users(id),
    parent_id    UUID REFERENCES public.issues(id) ON DELETE SET NULL,
    sprint_id    UUID,  -- FK sẽ thêm ở migration 006_sprints
    sort_order   DOUBLE PRECISION NOT NULL DEFAULT 0,
    due_date     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_issue_project_number UNIQUE (project_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_issues_project ON public.issues(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_parent ON public.issues(parent_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_key ON public.issues(key);
CREATE INDEX IF NOT EXISTS idx_issues_sprint ON public.issues(sprint_id);

-- Reuse update_updated_at() function from migration 002_user_extend
CREATE TRIGGER trg_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
