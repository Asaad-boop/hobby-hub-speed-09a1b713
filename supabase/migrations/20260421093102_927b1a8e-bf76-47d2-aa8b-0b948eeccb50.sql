create or replace function public.admin_rls_audit()
returns table (
  tablename text,
  rowsecurity boolean,
  policyname text,
  cmd text,
  permissive text,
  roles text[],
  qual text,
  with_check text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select t.tablename::text,
         t.rowsecurity,
         p.policyname::text,
         p.cmd::text,
         p.permissive::text,
         p.roles::text[],
         p.qual::text,
         p.with_check::text
  from pg_tables t
  left join pg_policies p
    on p.schemaname = t.schemaname and p.tablename = t.tablename
  where t.schemaname = 'public'
    and public.has_role(auth.uid(), 'admin'::app_role)
  order by t.tablename, p.policyname;
$$;

revoke all on function public.admin_rls_audit() from public, anon;
grant execute on function public.admin_rls_audit() to authenticated;