-- Run after migration 005.
do $$
declare missing_count integer;
declare policy_count integer;
declare rls_enabled boolean;
begin
  select count(*) into missing_count
  from (values ('seller_update'),('moderation_update'),('account_update')) expected(label)
  where not exists (
    select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='notification_kind' and e.enumlabel=expected.label
  );
  if missing_count <> 0 then raise exception 'Notification enum labels missing'; end if;
  select c.relrowsecurity into rls_enabled from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='notifications';
  if rls_enabled is distinct from true then raise exception 'notifications RLS is not enabled'; end if;
  select count(*) into policy_count from pg_policies
  where schemaname='public' and tablename='notifications';
  if policy_count <> 0 then raise exception 'Unexpected notifications RLS policies'; end if;
end $$;
