-- LUXE STORE marketplace expansion (PostgreSQL)
-- Prerequisite: backend/schema.sql has been reviewed and applied.
-- This migration adds marketplace records only. It does not enable checkout,
-- payments, public writes, or user-facing access. RLS remains default-deny.

do $$ begin
  create type public.order_status as enum (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'not_started', 'pending', 'paid', 'failed', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_kind as enum (
    'order_update', 'product_update', 'verification_update', 'support_update', 'system'
  );
exception when duplicate_object then null; end $$;

alter table public.products
  add column if not exists category_slug text,
  add column if not exists sku text,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists is_featured boolean not null default false;

alter table public.products
  add constraint products_stock_nonnegative check (stock_quantity >= 0);

create unique index if not exists products_seller_sku_unique_idx
  on public.products(seller_id, sku)
  where sku is not null;

create index if not exists products_category_listing_idx
  on public.products(category_slug, created_at desc)
  where status = 'published';

create table if not exists public.seller_storefronts (
  seller_id text primary key references public.profiles(id) on delete restrict,
  store_name text not null check (char_length(store_name) between 2 and 80),
  store_slug text not null unique check (store_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  logo_url text,
  banner_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  buyer_id text not null unique references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create index if not exists cart_items_product_idx on public.cart_items(product_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'LX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  buyer_id text not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'not_started',
  currency char(3) not null default 'GMD' check (currency = 'GMD'),
  subtotal_gmd numeric(12,2) not null check (subtotal_gmd >= 0),
  delivery_fee_gmd numeric(12,2) not null default 0 check (delivery_fee_gmd >= 0),
  total_gmd numeric(12,2) not null check (total_gmd >= 0),
  buyer_note text not null default '' check (char_length(buyer_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_history_idx
  on public.orders(buyer_id, created_at desc);
create index if not exists orders_status_queue_idx
  on public.orders(status, created_at);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  seller_id text not null references public.profiles(id) on delete restrict,
  product_title_snapshot text not null,
  sku_snapshot text,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_gmd numeric(12,2) not null check (unit_price_gmd >= 0),
  line_total_gmd numeric(12,2) generated always as (quantity * unit_price_gmd) stored,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_seller_idx on public.order_items(seller_id, created_at desc);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id text not null references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 2000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

create index if not exists product_reviews_public_idx
  on public.product_reviews(product_id, created_at desc)
  where is_published = true;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete restrict,
  kind public.notification_kind not null default 'system',
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1000),
  safe_payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_inbox_idx
  on public.notifications(user_id, created_at desc);

-- Fail closed until server-side identity mapping and reviewed RLS policies exist.
alter table public.seller_storefronts enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.notifications enable row level security;

-- IMPORTANT IMPLEMENTATION RULES:
-- * Never trust buyer_id/seller_id, prices, totals, stock, or payment status from clients.
-- * Checkout must be one server-side database transaction, lock product rows, recheck
--   published status and stock, calculate totals from database prices, then decrement stock.
-- * Payment status changes only from a verified payment-provider webhook.
-- * Do not store raw delivery addresses or identity documents in these tables.
-- * Seller order views must be derived from order_items.seller_id and server auth.
-- * Reviews require server verification of a completed order for that product.
