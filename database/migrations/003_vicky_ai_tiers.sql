-- Persist the Vicky AI plan used to choose its public identity badge colour.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vicky_plan text NOT NULL DEFAULT 'free';

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_vicky_plan_check
    CHECK (vicky_plan IN ('free', 'plus', 'pro', 'gold'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
