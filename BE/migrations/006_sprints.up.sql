-- Sprint: Quản lý sprint cho dự án Scrum
CREATE TABLE IF NOT EXISTS public.sprints (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    goal        TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning','active','completed')),
    start_date  TIMESTAMPTZ,
    end_date    TIMESTAMPTZ,
    created_by  UUID NOT NULL REFERENCES public.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);

-- Thêm FK sprint_id vào issues (cột đã tạo ở migration 004)
ALTER TABLE public.issues
  ADD CONSTRAINT fk_issues_sprint
  FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

-- Reuse update_updated_at() function từ migration 002_user_extend
CREATE TRIGGER trg_sprints_updated_at
    BEFORE UPDATE ON public.sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
