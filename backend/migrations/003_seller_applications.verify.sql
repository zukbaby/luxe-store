-- Run after 003_seller_applications.sql in staging.
do $$
declare
  rls_enabled boolean;
  policy_count integer;
begin
  select c.relrowsecurity into rls_enabled
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'seller_applications';

  if rls_enabled is distinct from true then
    raise exception 'seller_applications must have RLS enabled';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'seller_applications';

  if policy_count <> 0 then
    raise exception 'seller_applications must remain default-deny until policies are reviewed';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'seller_applications_one_pending_per_user_idx'
  ) then
    raise exception 'missing one-pending-application constraint index';
  end if;
end $$;
