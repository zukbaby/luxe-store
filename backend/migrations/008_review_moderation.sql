-- LUXE STORE product review moderation
-- Prerequisites: migrations 002 and 006. Reviews remain private until approved.

alter table public.product_reviews
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text references public.profiles(id) on delete restrict,
  add column if not exists moderation_note text not null default '';

create index if not exists product_reviews_moderation_queue_idx
  on public.product_reviews(created_at asc)
  where is_published = false;

-- RLS remains enabled and no permissive client policies are added.
