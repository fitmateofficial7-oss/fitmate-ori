begin;

-- Prevent rapid or concurrent checkout requests from creating duplicate Xendit
-- subscription sessions for the same FitMate account.
create table if not exists public.billing_checkout_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lock_token uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.acquire_billing_checkout_lock(
  p_user_id uuid,
  p_ttl_seconds integer default 90
)
returns table (
  allowed boolean,
  lock_token uuid,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid := gen_random_uuid();
  v_acquired_token uuid;
  v_expires_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  p_ttl_seconds := greatest(30, least(coalesce(p_ttl_seconds, 90), 300));

  insert into public.billing_checkout_locks (
    user_id,
    lock_token,
    expires_at
  ) values (
    p_user_id,
    v_token,
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (user_id) do update
  set
    lock_token = excluded.lock_token,
    expires_at = excluded.expires_at,
    updated_at = now()
  where public.billing_checkout_locks.expires_at <= now()
  returning public.billing_checkout_locks.lock_token,
    public.billing_checkout_locks.expires_at
  into v_acquired_token, v_expires_at;

  if v_acquired_token = v_token then
    return query select true, v_token, 0;
    return;
  end if;

  select lock_token, expires_at
  into v_acquired_token, v_expires_at
  from public.billing_checkout_locks
  where user_id = p_user_id;

  return query
  select false, null::uuid,
    greatest(1, ceil(extract(epoch from (v_expires_at - now())))::integer);
end;
$$;

create or replace function public.release_billing_checkout_lock(
  p_user_id uuid,
  p_lock_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  delete from public.billing_checkout_locks
  where user_id = p_user_id
    and lock_token = p_lock_token;

  return found;
end;
$$;

alter table public.billing_checkout_locks enable row level security;
revoke all on public.billing_checkout_locks from public, anon, authenticated;

revoke all on function public.acquire_billing_checkout_lock(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.release_billing_checkout_lock(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.acquire_billing_checkout_lock(uuid, integer)
  to service_role;
grant execute on function public.release_billing_checkout_lock(uuid, uuid)
  to service_role;

comment on table public.billing_checkout_locks is
  'Short-lived checkout mutex preventing duplicate Xendit subscription sessions.';

commit;
