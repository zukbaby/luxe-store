-- Run after migration 006.
do $$
declare found_status boolean;
declare rls_enabled boolean;
declare policy_count integer;
begin
  select exists(
    select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='product_status' and e.enumlabel='pending_review'
  ) into found_status;
  if not found_status then raise exception 'pending_review product status missing'; end if;
  select c.relrowsecurity into rls_enabled from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='products';
  if rls_enabled is distinct from true then raise exception 'products RLS is not enabled'; end if;
  select count(*) into policy_count from pg_policies
  where schemaname='public' and tablename='products';
  if policy_count <> 0 then raise exception 'Unexpected products RLS policies'; end if;
end $$;
