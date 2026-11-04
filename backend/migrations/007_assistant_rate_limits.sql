-- LUXE STORE assistant rate limiting
-- Prerequisites: base schema and migrations 002-006.
-- Per-user minute windows; all reads/writes remain server-side.

create table if not exists public.assistant_usage (
  user_id text primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.assistant_usage enable row level security;
-- Intentionally no client policies; only the authenticated server endpoint can update usage.
