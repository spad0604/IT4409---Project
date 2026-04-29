DROP TRIGGER IF EXISTS trg_sprints_updated_at ON public.sprints;
ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS fk_issues_sprint;
DROP TABLE IF EXISTS public.sprints;
