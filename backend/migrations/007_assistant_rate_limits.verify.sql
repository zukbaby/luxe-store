-- Run after migration 007.
do $$
declare rls_enabled boolean;
declare policy_count integer;
begin
  select c.relrowsecurity into rls_enabled from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='assistant_usage';
  if rls_enabled is distinct from true then raise exception 'assistant_usage RLS is not enabled'; end if;
  select count(*) into policy_count from pg_policies
  where schemaname='public' and tablename='assistant_usage';
  if policy_count <> 0 then raise exception 'Unexpected assistant_usage RLS policies'; end if;
end $$;
