-- LUXE STORE seller applications (PostgreSQL)
-- Prerequisites: backend/schema.sql and migration 002 have been reviewed/applied.
-- Seller access is granted only by the owner-controlled server decision endpoint.

do $$ begin
  create type public.seller_application_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete restrict,
  store_name text not null check (char_length(store_name) between 2 and 80),
  store_slug text not null check (store_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  status public.seller_application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text references public.profiles(id) on delete restrict,
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 1000),
  constraint seller_application_review_consistency check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index if not exists seller_applications_one_pending_per_user_idx
  on public.seller_applications(user_id) where status = 'pending';
create unique index if not exists seller_applications_active_slug_idx
  on public.seller_applications(store_slug) where status in ('pending', 'approved');
create index if not exists seller_applications_review_queue_idx
  on public.seller_applications(status, submitted_at asc);
create index if not exists seller_applications_user_history_idx
  on public.seller_applications(user_id, submitted_at desc);

alter table public.seller_applications enable row level security;

-- Intentionally no RLS policies. All reads/writes go through authenticated,
-- server-side endpoints until provider identity mapping and policies are reviewed.
