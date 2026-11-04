-- Run after 004_moderation.sql in staging.
do $$
declare
  rls_enabled boolean;
  policy_count integer;
begin
  select c.relrowsecurity into rls_enabled
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles';

  if rls_enabled is distinct from true then
    raise exception 'profiles must keep RLS enabled';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles';

  if policy_count <> 0 then
    raise exception 'profiles must remain default-deny until policies are reviewed';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'profiles_username_unique_idx'
  ) then
    raise exception 'missing unique username index';
  end if;
end $$;
