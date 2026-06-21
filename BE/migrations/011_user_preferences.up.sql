CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
  compact_mode boolean NOT NULL DEFAULT false,
  email_notifications boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_preferences_updated_at') THEN
    CREATE TRIGGER trg_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
