-- Run after 002_marketplace_core.sql in a staging database.
-- This checks schema presence and confirms the new tables still have no RLS policies.
-- It does not replace application-level authorization or integration tests.

do $$
declare
  table_name text;
  expected_tables text[] := array[
    'seller_storefronts', 'carts', 'cart_items', 'orders',
    'order_items', 'product_reviews', 'notifications'
  ];
  rls_enabled boolean;
  policy_count integer;
begin
  foreach table_name in array expected_tables loop
    select c.relrowsecurity
      into rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = table_name
       and c.relkind = 'r';

    if coalesce(rls_enabled, false) = false then
      raise exception 'Expected RLS enabled on public.%', table_name;
    end if;

    select count(*)
      into policy_count
      from pg_policies
     where schemaname = 'public'
       and tablename = table_name;

    if policy_count <> 0 then
      raise exception 'Expected default-deny with zero policies on public.%; found %',
        table_name, policy_count;
    end if;
  end loop;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'products'
       and column_name = 'stock_quantity'
  ) then
    raise exception 'Expected products.stock_quantity column';
  end if;
end $$;
