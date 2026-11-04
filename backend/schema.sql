-- LUXE STORE foundation schema (PostgreSQL)
-- Apply only after provisioning the database and reviewing this migration.
-- Never expose service-role/database credentials to the browser.

create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'seller', 'creator', 'admin');
create type public.verification_status as enum ('not_submitted', 'pending', 'approved', 'rejected');
create type public.product_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key, -- must equal the authenticated provider's user id
  display_name text not null check (char_length(display_name) between 1 and 60),
  role public.account_role not null default 'customer',
  verification_status public.verification_status not null default 'not_submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  price_gmd numeric(12,2) not null check (price_gmd >= 0),
  image_url text,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  legal_name text not null,
  status public.verification_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewer_note text,
  constraint verification_review_consistency check (
    (status in ('approved','rejected') and reviewed_at is not null and reviewed_by is not null)
    or (status in ('pending','not_submitted') and reviewed_at is null and reviewed_by is null)
  )
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_public_listing_idx on public.products(status, created_at desc);
create index products_seller_idx on public.products(seller_id, created_at desc);
create index verification_queue_idx on public.verification_requests(status, submitted_at);

-- Default-deny. Policies must be added only after the chosen auth provider is wired
-- and its verified server-side identity/role claims are available.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.verification_requests enable row level security;
alter table public.admin_audit_log enable row level security;

-- Intentionally no public write policies. Do not add policies trusting client-supplied
-- role values. Admin mutations must run server-side after checking a verified admin claim.
