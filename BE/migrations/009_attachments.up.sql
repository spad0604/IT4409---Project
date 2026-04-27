-- Tệp đính kèm cho công việc
CREATE TABLE IF NOT EXISTS public.attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id     UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    uploaded_by  UUID NOT NULL REFERENCES public.users(id),
    filename     TEXT NOT NULL,
    file_size    BIGINT NOT NULL DEFAULT 0,
    mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
    storage_path TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_issue ON public.attachments(issue_id);
