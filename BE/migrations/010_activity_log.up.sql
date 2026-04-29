-- Nhật ký hoạt động (activity_log): Lịch sử thay đổi công việc
CREATE TABLE IF NOT EXISTS public.activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id    UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id),
    action      TEXT NOT NULL,
    field       TEXT,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_issue ON public.activity_log(issue_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at);
