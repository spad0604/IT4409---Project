DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
DROP FUNCTION IF EXISTS update_updated_at;
ALTER TABLE public.users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS updated_at;
