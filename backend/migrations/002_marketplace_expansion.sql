-- LUXE STORE marketplace expansion.
-- Review and apply only after Neon is provisioned and a backup exists.
-- This migration does not create seller accounts or approve applicants.

alter table public.products
  add column if not exists currency_code char(3) not null default 'GMD',
  add column if not exists category varchar(80) not null default 'Other';

alter table public.products
  add constraint products_currency_code_format
  check (currency_code ~ '^[A-Z]{3}$');

create type public.seller_application_status as enum ('pending', 'approved', 'rejected');

create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete restrict,
  business_name varchar(100) not null check (char_length(business_name) between 2 and 100),
  category varchar(80) not null check (char_length(category) between 2 and 80),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  contact_email varchar(254),
  description varchar(1000) not null default '',
  status public.seller_application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text references public.profiles(id) on delete restrict,
  reviewer_note varchar(500),
  constraint seller_application_review_consistency check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved','rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index seller_one_pending_application_per_user
  on public.seller_applications(user_id) where status = 'pending';
create index seller_application_review_queue
  on public.seller_applications(status, submitted_at);

alter table public.seller_applications enable row level security;

-- No browser-facing policies are added. Server APIs must authenticate the
-- applicant, derive user_id from the verified session, and enforce owner review.
