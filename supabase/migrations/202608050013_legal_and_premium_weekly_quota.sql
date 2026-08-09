begin;

-- ---------------------------------------------------------------------------
-- v14.50 billing consent types
-- ---------------------------------------------------------------------------

alter table public.user_consents
  drop constraint if exists user_consents_consent_type_check;

alter table public.user_consents
  add constraint user_consents_consent_type_check
  check (
    consent_type in (
      'terms',
      'privacy',
      'ai_processing',
      'subscription_terms',
      'recurring_payment'
    )
  );

-- ---------------------------------------------------------------------------
-- Premium workout-plan quota: 10 successful generations per Jakarta week.
-- A week starts Monday 00:00 Asia/Jakarta. Only a completed reservation is
-- counted, so provider/AI errors released before completion do not use quota.
-- ---------------------------------------------------------------------------

alter table public.plan_generation_usage
  add column if not exists premium_week_start date not null
    default (date_trunc('week', timezone('Asia/Jakarta', now())))::date,
  add column if not exists premium_week_successful_generations smallint not null
    default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plan_generation_usage_premium_week_count_check'
      and conrelid = 'public.plan_generation_usage'::regclass
  ) then
    alter table public.plan_generation_usage
      add constraint plan_generation_usage_premium_week_count_check
      check (premium_week_successful_generations between 0 and 10);
  end if;
end $$;

create or replace function public.reserve_plan_generation(p_user_id uuid)
returns table (
  allowed boolean,
  reservation_id uuid,
  entitlement text,
  free_used integer,
  free_limit integer,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usage public.plan_generation_usage%rowtype;
  v_premium boolean := false;
  v_reserved_free integer := 0;
  v_active_reservations integer := 0;
  v_reservation_id uuid;
  v_week_start date := (date_trunc('week', timezone('Asia/Jakarta', now())))::date;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  update public.plan_generation_reservations
  set status = 'expired'
  where user_id = p_user_id
    and status = 'reserved'
    and expires_at <= now();

  insert into public.plan_generation_usage (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_usage
  from public.plan_generation_usage
  where user_id = p_user_id
  for update;

  if v_usage.premium_week_start is distinct from v_week_start then
    update public.plan_generation_usage
    set premium_week_start = v_week_start,
      premium_week_successful_generations = 0,
      updated_at = now()
    where user_id = p_user_id
    returning * into v_usage;
  end if;

  select exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'past_due', 'canceled')
      and s.current_period_end is not null
      and s.current_period_end > now()
  ) into v_premium;

  select count(*)::integer
  into v_active_reservations
  from public.plan_generation_reservations r
  where r.user_id = p_user_id
    and r.status = 'reserved'
    and r.expires_at > now();

  if v_active_reservations > 0 then
    return query
    select false, null::uuid,
      case when v_premium then 'premium'::text else 'free'::text end,
      v_usage.free_successful_generations::integer, 2,
      'GENERATION_IN_PROGRESS'::text;
    return;
  end if;

  if v_premium then
    if v_usage.premium_week_successful_generations >= 10 then
      return query
      select false, null::uuid, 'premium'::text,
        v_usage.free_successful_generations::integer, 2,
        'PREMIUM_WEEKLY_LIMIT_REACHED'::text;
      return;
    end if;

    insert into public.plan_generation_reservations (user_id, entitlement)
    values (p_user_id, 'premium')
    returning id into v_reservation_id;

    return query
    select true, v_reservation_id, 'premium'::text,
      v_usage.free_successful_generations::integer, 2, null::text;
    return;
  end if;

  select count(*)::integer
  into v_reserved_free
  from public.plan_generation_reservations r
  where r.user_id = p_user_id
    and r.entitlement = 'free'
    and r.status = 'reserved'
    and r.expires_at > now();

  if v_usage.free_successful_generations + v_reserved_free >= 2 then
    return query
    select false, null::uuid, 'free'::text,
      v_usage.free_successful_generations::integer, 2,
      'FREE_LIFETIME_LIMIT_REACHED'::text;
    return;
  end if;

  insert into public.plan_generation_reservations (user_id, entitlement)
  values (p_user_id, 'free')
  returning id into v_reservation_id;

  return query
  select true, v_reservation_id, 'free'::text,
    v_usage.free_successful_generations::integer, 2, null::text;
end;
$$;

create or replace function public.count_completed_premium_plan_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date := (date_trunc('week', timezone('Asia/Jakarta', now())))::date;
begin
  if old.status is distinct from 'completed'
    and new.status = 'completed'
    and new.entitlement = 'premium' then
    update public.plan_generation_usage
    set premium_week_successful_generations = case
        when premium_week_start = v_week_start
          then least(10, premium_week_successful_generations + 1)
        else 1
      end,
      premium_week_start = v_week_start,
      updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists count_completed_premium_plan_generation
  on public.plan_generation_reservations;
create trigger count_completed_premium_plan_generation
after update of status on public.plan_generation_reservations
for each row execute function public.count_completed_premium_plan_generation();

revoke all on function public.reserve_plan_generation(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_plan_generation(uuid) to service_role;

revoke all on function public.count_completed_premium_plan_generation()
  from public, anon, authenticated;

comment on column public.plan_generation_usage.premium_week_start is
  'Monday date for the active Asia/Jakarta Premium plan-generation quota window.';
comment on column public.plan_generation_usage.premium_week_successful_generations is
  'Successful Premium workout-plan generations in the active Jakarta week, capped at 10.';

commit;

notify pgrst, 'reload schema';
