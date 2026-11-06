ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_type text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_badge_type_check
    CHECK (badge_type IN ('none', 'paid_verified', 'vip'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;
