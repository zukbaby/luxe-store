-- LUXE STORE moderation foundation
-- Prerequisites: base schema and migrations 002/003.
-- Username is public-facing and unique; moderation state is server-controlled.

alter table public.profiles
  add column if not exists username text,
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason text;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,24}$');
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_active_bans_idx
  on public.profiles (banned_until)
  where banned_until is not null;

-- RLS was enabled by backend/schema.sql; this migration deliberately adds
-- no client policies. Ban state can only be changed through owner-authenticated APIs.
