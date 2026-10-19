begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

-- No client can grant itself an admin role. Only the project owner assigns admins.
create function public.account_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'verified', exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous),
    'admin', exists(select 1 from private.admin_users a join auth.users u on u.id=a.user_id
                    where a.user_id=auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous)
  );
$$;
revoke all on function public.account_access() from public, anon;
grant execute on function public.account_access() to authenticated;

-- Future purchase/sale policies must call this on the server, not trust the UI.
create function public.has_verified_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous);
$$;
revoke all on function public.has_verified_account() from public, anon;
grant execute on function public.has_verified_account() to authenticated;

create function public.admin_account_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.account_access()->>'admin')::boolean then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  return (select jsonb_build_object('accounts',count(*),'verified',count(*) filter(where email_confirmed_at is not null)) from auth.users where not is_anonymous);
end;
$$;
revoke all on function public.admin_account_stats() from public, anon;
grant execute on function public.admin_account_stats() to authenticated;
commit;
