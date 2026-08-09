begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- AI feature entitlements
-- Free: one successful consultation and one successful meal scan for life.
-- Premium: ten successful consultations and ten successful meal scans per
-- Jakarta calendar day while the subscription is active.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_feature_usage_lifetime (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_chat_successes smallint not null default 0
    check (free_chat_successes between 0 and 1),
  free_nutrition_successes smallint not null default 0
    check (free_nutrition_successes between 0 and 1),
  total_chat_successes integer not null default 0
    check (total_chat_successes >= 0),
  total_nutrition_successes integer not null default 0
    check (total_nutrition_successes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_feature_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  premium_chat_successes smallint not null default 0
    check (premium_chat_successes between 0 and 10),
  premium_nutrition_successes smallint not null default 0
    check (premium_nutrition_successes between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists ai_feature_usage_daily_user_date_idx
  on public.ai_feature_usage_daily (user_id, usage_date desc);

create table if not exists public.ai_feature_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('chat', 'nutrition')),
  entitlement text not null check (entitlement in ('free', 'premium')),
  usage_date date,
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'released', 'expired')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  completed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_feature_usage_reservations_user_feature_idx
  on public.ai_feature_usage_reservations (user_id, feature, status, expires_at);

-- Existing successful requests count toward the lifetime Free trial. This
-- prevents an account that already used the old version from receiving a
-- second free trial after the migration.
insert into public.ai_feature_usage_lifetime (
  user_id,
  free_chat_successes,
  free_nutrition_successes,
  total_chat_successes,
  total_nutrition_successes
)
select
  u.id,
  case when coalesce(c.chat_count, 0) > 0 then 1 else 0 end,
  case when coalesce(c.nutrition_count, 0) > 0 then 1 else 0 end,
  coalesce(c.chat_count, 0),
  coalesce(c.nutrition_count, 0)
from auth.users u
left join lateral (
  select
    count(*) filter (where cm.mode = 'chat' and cm.role = 'user')::integer as chat_count,
    count(*) filter (where cm.mode = 'nutrition' and cm.role = 'user')::integer as nutrition_count
  from public.coach_messages cm
  where cm.user_id = u.id
) c on true
on conflict (user_id) do update
set
  free_chat_successes = greatest(
    public.ai_feature_usage_lifetime.free_chat_successes,
    excluded.free_chat_successes
  ),
  free_nutrition_successes = greatest(
    public.ai_feature_usage_lifetime.free_nutrition_successes,
    excluded.free_nutrition_successes
  ),
  total_chat_successes = greatest(
    public.ai_feature_usage_lifetime.total_chat_successes,
    excluded.total_chat_successes
  ),
  total_nutrition_successes = greatest(
    public.ai_feature_usage_lifetime.total_nutrition_successes,
    excluded.total_nutrition_successes
  ),
  updated_at = now();

create or replace function public.reserve_ai_feature_usage(
  p_user_id uuid,
  p_feature text
)
returns table (
  allowed boolean,
  reservation_id uuid,
  plan text,
  used integer,
  usage_limit integer,
  remaining integer,
  resets_at timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifetime public.ai_feature_usage_lifetime%rowtype;
  v_daily public.ai_feature_usage_daily%rowtype;
  v_premium boolean := false;
  v_usage_date date := (now() at time zone 'Asia/Jakarta')::date;
  v_next_reset timestamptz := ((v_usage_date + 1)::timestamp at time zone 'Asia/Jakarta');
  v_used integer := 0;
  v_reserved integer := 0;
  v_limit integer := 0;
  v_reservation_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_feature not in ('chat', 'nutrition') then
    raise exception 'unsupported AI feature';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  update public.ai_feature_usage_reservations
  set status = 'expired'
  where user_id = p_user_id
    and feature = p_feature
    and status = 'reserved'
    and expires_at <= now();

  insert into public.ai_feature_usage_lifetime (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_lifetime
  from public.ai_feature_usage_lifetime
  where user_id = p_user_id
  for update;

  select exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = p_user_id
      and (
        s.status = 'active'
        or (
          s.status = 'canceled'
          and s.current_period_end is not null
          and s.current_period_end > now()
        )
      )
      and (s.current_period_end is null or s.current_period_end > now())
  ) into v_premium;

  if v_premium then
    insert into public.ai_feature_usage_daily (user_id, usage_date)
    values (p_user_id, v_usage_date)
    on conflict (user_id, usage_date) do nothing;

    select *
    into v_daily
    from public.ai_feature_usage_daily
    where user_id = p_user_id
      and usage_date = v_usage_date
    for update;

    v_limit := 10;
    v_used := case
      when p_feature = 'chat' then v_daily.premium_chat_successes
      else v_daily.premium_nutrition_successes
    end;

    select count(*)::integer
    into v_reserved
    from public.ai_feature_usage_reservations r
    where r.user_id = p_user_id
      and r.feature = p_feature
      and r.entitlement = 'premium'
      and r.usage_date = v_usage_date
      and r.status = 'reserved'
      and r.expires_at > now();

    if v_used + v_reserved >= v_limit then
      return query
      select false, null::uuid, 'premium'::text, v_used, v_limit,
        greatest(0, v_limit - v_used), v_next_reset,
        'PREMIUM_DAILY_LIMIT_REACHED'::text;
      return;
    end if;

    insert into public.ai_feature_usage_reservations (
      user_id, feature, entitlement, usage_date
    ) values (
      p_user_id, p_feature, 'premium', v_usage_date
    ) returning id into v_reservation_id;

    return query
    select true, v_reservation_id, 'premium'::text, v_used, v_limit,
      greatest(0, v_limit - v_used - 1), v_next_reset, null::text;
    return;
  end if;

  v_limit := 1;
  v_used := case
    when p_feature = 'chat' then v_lifetime.free_chat_successes
    else v_lifetime.free_nutrition_successes
  end;

  select count(*)::integer
  into v_reserved
  from public.ai_feature_usage_reservations r
  where r.user_id = p_user_id
    and r.feature = p_feature
    and r.entitlement = 'free'
    and r.status = 'reserved'
    and r.expires_at > now();

  if v_used + v_reserved >= v_limit then
    return query
    select false, null::uuid, 'free'::text, v_used, v_limit,
      greatest(0, v_limit - v_used), null::timestamptz,
      'FREE_LIFETIME_LIMIT_REACHED'::text;
    return;
  end if;

  insert into public.ai_feature_usage_reservations (
    user_id, feature, entitlement, usage_date
  ) values (
    p_user_id, p_feature, 'free', null
  ) returning id into v_reservation_id;

  return query
  select true, v_reservation_id, 'free'::text, v_used, v_limit,
    greatest(0, v_limit - v_used - 1), null::timestamptz, null::text;
end;
$$;

create or replace function public.finalize_ai_feature_usage(
  p_reservation_id uuid
)
returns table (
  plan text,
  feature text,
  used integer,
  usage_limit integer,
  remaining integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.ai_feature_usage_reservations%rowtype;
  v_lifetime public.ai_feature_usage_lifetime%rowtype;
  v_daily public.ai_feature_usage_daily%rowtype;
  v_used integer;
  v_limit integer;
begin
  select *
  into v_reservation
  from public.ai_feature_usage_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'AI usage reservation not found';
  end if;

  if auth.uid() is not null and auth.uid() <> v_reservation.user_id then
    raise exception 'not authorized';
  end if;

  if v_reservation.status = 'completed' then
    if v_reservation.entitlement = 'premium' then
      select * into v_daily
      from public.ai_feature_usage_daily
      where user_id = v_reservation.user_id
        and usage_date = v_reservation.usage_date;

      v_used := case
        when v_reservation.feature = 'chat' then v_daily.premium_chat_successes
        else v_daily.premium_nutrition_successes
      end;
      v_limit := 10;
    else
      select * into v_lifetime
      from public.ai_feature_usage_lifetime
      where user_id = v_reservation.user_id;

      v_used := case
        when v_reservation.feature = 'chat' then v_lifetime.free_chat_successes
        else v_lifetime.free_nutrition_successes
      end;
      v_limit := 1;
    end if;

    return query
    select v_reservation.entitlement, v_reservation.feature, v_used, v_limit,
      greatest(0, v_limit - v_used),
      case
        when v_reservation.entitlement = 'premium'
          then (((v_reservation.usage_date + 1)::timestamp) at time zone 'Asia/Jakarta')
        else null::timestamptz
      end;
    return;
  end if;

  if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then
    raise exception 'AI usage reservation is no longer active';
  end if;

  if v_reservation.entitlement = 'premium' then
    update public.ai_feature_usage_daily
    set
      premium_chat_successes = case
        when v_reservation.feature = 'chat'
          then least(10, premium_chat_successes + 1)
        else premium_chat_successes
      end,
      premium_nutrition_successes = case
        when v_reservation.feature = 'nutrition'
          then least(10, premium_nutrition_successes + 1)
        else premium_nutrition_successes
      end,
      updated_at = now()
    where user_id = v_reservation.user_id
      and usage_date = v_reservation.usage_date
    returning * into v_daily;

    v_used := case
      when v_reservation.feature = 'chat' then v_daily.premium_chat_successes
      else v_daily.premium_nutrition_successes
    end;
    v_limit := 10;
  else
    update public.ai_feature_usage_lifetime
    set
      free_chat_successes = case
        when v_reservation.feature = 'chat'
          then least(1, free_chat_successes + 1)
        else free_chat_successes
      end,
      free_nutrition_successes = case
        when v_reservation.feature = 'nutrition'
          then least(1, free_nutrition_successes + 1)
        else free_nutrition_successes
      end,
      total_chat_successes = case
        when v_reservation.feature = 'chat'
          then total_chat_successes + 1
        else total_chat_successes
      end,
      total_nutrition_successes = case
        when v_reservation.feature = 'nutrition'
          then total_nutrition_successes + 1
        else total_nutrition_successes
      end,
      updated_at = now()
    where user_id = v_reservation.user_id
    returning * into v_lifetime;

    v_used := case
      when v_reservation.feature = 'chat' then v_lifetime.free_chat_successes
      else v_lifetime.free_nutrition_successes
    end;
    v_limit := 1;
  end if;

  if v_reservation.entitlement = 'premium' then
    update public.ai_feature_usage_lifetime
    set
      total_chat_successes = case
        when v_reservation.feature = 'chat'
          then total_chat_successes + 1
        else total_chat_successes
      end,
      total_nutrition_successes = case
        when v_reservation.feature = 'nutrition'
          then total_nutrition_successes + 1
        else total_nutrition_successes
      end,
      updated_at = now()
    where user_id = v_reservation.user_id;
  end if;

  update public.ai_feature_usage_reservations
  set status = 'completed', completed_at = now()
  where id = p_reservation_id;

  return query
  select v_reservation.entitlement, v_reservation.feature, v_used, v_limit,
    greatest(0, v_limit - v_used),
    case
      when v_reservation.entitlement = 'premium'
        then (((v_reservation.usage_date + 1)::timestamp) at time zone 'Asia/Jakarta')
      else null::timestamptz
    end;
end;
$$;

create or replace function public.release_ai_feature_usage(
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id
  into v_user_id
  from public.ai_feature_usage_reservations
  where id = p_reservation_id;

  if not found then
    return false;
  end if;

  if auth.uid() is not null and auth.uid() <> v_user_id then
    raise exception 'not authorized';
  end if;

  update public.ai_feature_usage_reservations
  set status = 'released', released_at = now()
  where id = p_reservation_id
    and status = 'reserved';

  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Updated-at triggers and RLS
-- ---------------------------------------------------------------------------

drop trigger if exists ai_feature_usage_lifetime_set_updated_at on public.ai_feature_usage_lifetime;
create trigger ai_feature_usage_lifetime_set_updated_at
before update on public.ai_feature_usage_lifetime
for each row execute function public.set_updated_at();

drop trigger if exists ai_feature_usage_daily_set_updated_at on public.ai_feature_usage_daily;
create trigger ai_feature_usage_daily_set_updated_at
before update on public.ai_feature_usage_daily
for each row execute function public.set_updated_at();

alter table public.ai_feature_usage_lifetime enable row level security;
alter table public.ai_feature_usage_daily enable row level security;
alter table public.ai_feature_usage_reservations enable row level security;

drop policy if exists ai_feature_usage_lifetime_owner_select on public.ai_feature_usage_lifetime;
create policy ai_feature_usage_lifetime_owner_select
on public.ai_feature_usage_lifetime for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists ai_feature_usage_daily_owner_select on public.ai_feature_usage_daily;
create policy ai_feature_usage_daily_owner_select
on public.ai_feature_usage_daily for select
to authenticated
using (auth.uid() = user_id);

revoke all on public.ai_feature_usage_lifetime from anon;
revoke all on public.ai_feature_usage_daily from anon;
revoke all on public.ai_feature_usage_reservations from anon, authenticated;

grant select on public.ai_feature_usage_lifetime to authenticated;
grant select on public.ai_feature_usage_daily to authenticated;

revoke all on function public.reserve_ai_feature_usage(uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_ai_feature_usage(uuid) from public, anon, authenticated;
revoke all on function public.release_ai_feature_usage(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_feature_usage(uuid, text) to service_role;
grant execute on function public.finalize_ai_feature_usage(uuid) to service_role;
grant execute on function public.release_ai_feature_usage(uuid) to service_role;

comment on table public.ai_feature_usage_lifetime is 'Lifetime FitMate AI usage and Free trial consumption.';
comment on table public.ai_feature_usage_daily is 'Jakarta-day Premium AI usage counters.';
comment on table public.ai_feature_usage_reservations is 'Short-lived reservations preventing concurrent requests from bypassing AI limits.';

commit;
