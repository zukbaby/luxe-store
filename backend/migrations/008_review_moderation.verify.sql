-- Run after migration 008.
do $$
declare rls_enabled boolean;
declare policy_count integer;
begin
  select c.relrowsecurity into rls_enabled from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='product_reviews';
  if rls_enabled is distinct from true then raise exception 'product_reviews RLS is not enabled'; end if;
  select count(*) into policy_count from pg_policies
  where schemaname='public' and tablename='product_reviews';
  if policy_count <> 0 then raise exception 'Unexpected product_reviews RLS policies'; end if;
end $$;
