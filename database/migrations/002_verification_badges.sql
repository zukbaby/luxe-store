-- LUXE STORE verification badge tiers.
-- Blue is reserved and derived from the configured owner / official DAMA identity.
-- Green and gold are stored on profiles and can only be changed by the owner API.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_badge text;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_verification_badge_check
    CHECK (verification_badge IS NULL OR verification_badge IN ('green', 'gold'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Badge tiers are granted only by an explicit owner command after eligibility is checked.
