-- LUXE STORE product review workflow
-- Prerequisites: base schema and migrations 002-005.
-- Products stay private until an owner explicitly publishes them.

alter type public.product_status add value if not exists 'pending_review';

alter table public.products
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text references public.profiles(id) on delete restrict,
  add column if not exists review_note text not null default '';

create index if not exists products_review_queue_idx
  on public.products(status, created_at asc)
  where status = 'pending_review';

-- RLS remains enabled and no permissive policies are added.
