-- FitMate Premium + AI quota database setup
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- It is safe to run again because tables, policies, and functions are created idempotently.


-- ============================================================================
-- 202607300009_subscription_and_generation_quota.sql
-- ============================================================================
begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Billing and subscription state
-- ---------------------------------------------------------------------------

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'xendit' check (provider in ('xendit')),
  plan_code text not null default 'premium_monthly' check (plan_code in ('premium_monthly')),
  reference_id text not null,
  provider_session_id text,
  provider_plan_id text,
  provider_customer_id text,
  status text not null default 'pending'
    check (status in ('pending', 'requires_action', 'active', 'past_due', 'canceled', 'inactive', 'expired', 'failed')),
  provider_status text,
  amount integer not null default 49000 check (amount >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  billing_interval text not null default 'MONTH' check (billing_interval = 'MONTH'),
  interval_count smallint not null default 1 check (interval_count = 1),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  activated_at timestamptz,
  last_payment_at timestamptz,
  last_payment_id text,
  failure_code text,
  checkout_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_reference_uidx
  on public.user_subscriptions (reference_id);

create unique index if not exists user_subscriptions_provider_plan_uidx
  on public.user_subscriptions (provider_plan_id)
  where provider_plan_id is not null;

create unique index if not exists user_subscriptions_provider_session_uidx
  on public.user_subscriptions (provider_session_id)
  where provider_session_id is not null;

create index if not exists user_subscriptions_user_created_idx
  on public.user_subscriptions (user_id, created_at desc);

create index if not exists user_subscriptions_user_status_idx
  on public.user_subscriptions (user_id, status, current_period_end desc);

create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  provider text not null default 'xendit' check (provider in ('xendit')),
  provider_cycle_id text,
  provider_payment_id text,
  reference_id text,
  status text not null
    check (status in ('pending', 'succeeded', 'retrying', 'failed', 'canceled', 'refunded')),
  amount integer check (amount is null or amount >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_transactions_cycle_uidx
  on public.billing_transactions (provider, provider_cycle_id)
  where provider_cycle_id is not null;

create unique index if not exists billing_transactions_payment_uidx
  on public.billing_transactions (provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists billing_transactions_user_created_idx
  on public.billing_transactions (user_id, created_at desc);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'xendit' check (provider in ('xendit')),
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  processing_error text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists billing_webhook_events_provider_event_uidx
  on public.billing_webhook_events (provider, provider_event_id);

-- ---------------------------------------------------------------------------
-- Lifetime free generation quota and concurrency-safe reservations
-- ---------------------------------------------------------------------------

create table if not exists public.plan_generation_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_successful_generations smallint not null default 0
    check (free_successful_generations between 0 and 2),
  total_successful_generations integer not null default 0
    check (total_successful_generations >= 0),
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null check (entitlement in ('free', 'premium')),
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'released', 'expired')),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  completed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists plan_generation_reservations_user_status_idx
  on public.plan_generation_reservations (user_id, status, expires_at);

-- Existing users already holding a generated plan start with one consumed free
-- generation because older versions did not keep a generation counter.
insert into public.plan_generation_usage (
  user_id,
  free_successful_generations,
  total_successful_generations,
  last_generated_at
)
select
  wp.user_id,
  1,
  1,
  coalesce(wp.updated_at, wp.created_at, now())
from public.workout_plans wp
where wp.user_id is not null
on conflict (user_id) do nothing;

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
end $$;

create or replace function public.finalize_plan_generation(p_reservation_id uuid)
returns table (
  entitlement text,
  free_used integer,
  free_limit integer,
  total_generated integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.plan_generation_reservations%rowtype;
  v_usage public.plan_generation_usage%rowtype;
begin
  select *
  into v_reservation
  from public.plan_generation_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'generation reservation not found';
  end if;

  if auth.uid() is not null and auth.uid() <> v_reservation.user_id then
    raise exception 'not authorized';
  end if;

  if v_reservation.status = 'completed' then
    select * into v_usage
    from public.plan_generation_usage
    where user_id = v_reservation.user_id;

    return query
    select v_reservation.entitlement,
      v_usage.free_successful_generations::integer,
      2,
      v_usage.total_successful_generations;
    return;
  end if;

  if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then
    raise exception 'generation reservation is no longer active';
  end if;

  update public.plan_generation_usage
  set
    free_successful_generations = case
      when v_reservation.entitlement = 'free'
        then least(2, free_successful_generations + 1)
      else free_successful_generations
    end,
    total_successful_generations = total_successful_generations + 1,
    last_generated_at = now(),
    updated_at = now()
  where user_id = v_reservation.user_id
  returning * into v_usage;

  update public.plan_generation_reservations
  set status = 'completed', completed_at = now()
  where id = p_reservation_id;

  return query
  select v_reservation.entitlement,
    v_usage.free_successful_generations::integer,
    2,
    v_usage.total_successful_generations;
end;
$$;

create or replace function public.release_plan_generation(p_reservation_id uuid)
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
  from public.plan_generation_reservations
  where id = p_reservation_id;

  if not found then
    return false;
  end if;

  if auth.uid() is not null and auth.uid() <> v_user_id then
    raise exception 'not authorized';
  end if;

  update public.plan_generation_reservations
  set status = 'released', released_at = now()
  where id = p_reservation_id
    and status = 'reserved';

  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Version history for generated workout plans
-- ---------------------------------------------------------------------------

create table if not exists public.workout_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id bigint references public.workout_plans(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  plan jsonb not null,
  goal text not null,
  level text not null check (level in ('easy', 'medium', 'hard')),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  generated_by_model text,
  generation_entitlement text check (generation_entitlement in ('free', 'premium')),
  created_at timestamptz not null default now(),
  unique (user_id, version_number)
);

create index if not exists workout_plan_versions_user_created_idx
  on public.workout_plan_versions (user_id, created_at desc);

create or replace function public.complete_plan_generation(
  p_reservation_id uuid,
  p_workout_plan_id bigint,
  p_plan jsonb,
  p_goal text,
  p_level text,
  p_days_per_week smallint,
  p_generated_by_model text
)
returns table (
  entitlement text,
  free_used integer,
  free_limit integer,
  total_generated integer,
  version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.plan_generation_reservations%rowtype;
  v_usage public.plan_generation_usage%rowtype;
  v_version_id uuid;
  v_version_number integer;
begin
  select *
  into v_reservation
  from public.plan_generation_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'generation reservation not found';
  end if;

  if auth.uid() is not null and auth.uid() <> v_reservation.user_id then
    raise exception 'not authorized';
  end if;

  if v_reservation.status = 'completed' then
    select * into v_usage
    from public.plan_generation_usage
    where user_id = v_reservation.user_id;

    select wpv.id, wpv.version_number
    into v_version_id, v_version_number
    from public.workout_plan_versions wpv
    where wpv.user_id = v_reservation.user_id
    order by created_at desc
    limit 1;

    return query
    select v_reservation.entitlement,
      v_usage.free_successful_generations::integer,
      2,
      v_usage.total_successful_generations,
      v_version_id,
      v_version_number;
    return;
  end if;

  if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then
    raise exception 'generation reservation is no longer active';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_reservation.user_id::text, 0));

  select coalesce(max(wpv.version_number), 0) + 1
  into v_version_number
  from public.workout_plan_versions wpv
  where wpv.user_id = v_reservation.user_id;

  insert into public.workout_plan_versions (
    user_id,
    workout_plan_id,
    version_number,
    plan,
    goal,
    level,
    days_per_week,
    generated_by_model,
    generation_entitlement
  ) values (
    v_reservation.user_id,
    p_workout_plan_id,
    v_version_number,
    p_plan,
    p_goal,
    p_level,
    p_days_per_week,
    p_generated_by_model,
    v_reservation.entitlement
  )
  returning id into v_version_id;

  update public.plan_generation_usage
  set
    free_successful_generations = case
      when v_reservation.entitlement = 'free'
        then least(2, free_successful_generations + 1)
      else free_successful_generations
    end,
    total_successful_generations = total_successful_generations + 1,
    last_generated_at = now(),
    updated_at = now()
  where user_id = v_reservation.user_id
  returning * into v_usage;

  update public.plan_generation_reservations
  set status = 'completed', completed_at = now()
  where id = p_reservation_id;

  return query
  select v_reservation.entitlement,
    v_usage.free_successful_generations::integer,
    2,
    v_usage.total_successful_generations,
    v_version_id,
    v_version_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- Explicit legal consent record
-- ---------------------------------------------------------------------------

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null
    check (consent_type in ('terms', 'privacy', 'ai_processing')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, consent_type, document_version)
);

create index if not exists user_consents_user_idx
  on public.user_consents (user_id, accepted_at desc);

create or replace function public.record_initial_fitmate_consents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_accepted_at timestamptz := coalesce(
    nullif(v_metadata ->> 'fitmate_consented_at', '')::timestamptz,
    now()
  );
begin
  if coalesce((v_metadata ->> 'fitmate_terms_accepted')::boolean, false) then
    insert into public.user_consents (
      user_id, consent_type, document_version, accepted_at, metadata
    ) values (
      new.id,
      'terms',
      coalesce(nullif(v_metadata ->> 'fitmate_terms_version', ''), 'unknown'),
      v_accepted_at,
      jsonb_build_object('source', 'registration')
    ) on conflict do nothing;
  end if;

  if coalesce((v_metadata ->> 'fitmate_privacy_accepted')::boolean, false) then
    insert into public.user_consents (
      user_id, consent_type, document_version, accepted_at, metadata
    ) values (
      new.id,
      'privacy',
      coalesce(nullif(v_metadata ->> 'fitmate_privacy_version', ''), 'unknown'),
      v_accepted_at,
      jsonb_build_object('source', 'registration')
    ) on conflict do nothing;
  end if;

  if coalesce((v_metadata ->> 'fitmate_ai_processing_accepted')::boolean, false) then
    insert into public.user_consents (
      user_id, consent_type, document_version, accepted_at, metadata
    ) values (
      new.id,
      'ai_processing',
      coalesce(nullif(v_metadata ->> 'fitmate_ai_processing_version', ''), 'unknown'),
      v_accepted_at,
      jsonb_build_object('source', 'registration')
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_record_fitmate_consents on auth.users;
create trigger on_auth_user_record_fitmate_consents
after insert on auth.users
for each row execute function public.record_initial_fitmate_consents();

-- Backfill consent metadata for accounts created before this migration when the
-- metadata already contains an explicit FitMate consent record.
insert into public.user_consents (user_id, consent_type, document_version, accepted_at, metadata)
select
  u.id,
  consent.consent_type,
  consent.document_version,
  coalesce(nullif(u.raw_user_meta_data ->> 'fitmate_consented_at', '')::timestamptz, u.created_at),
  jsonb_build_object('source', 'registration_backfill')
from auth.users u
cross join lateral (
  values
    ('terms'::text, u.raw_user_meta_data ->> 'fitmate_terms_version', u.raw_user_meta_data ->> 'fitmate_terms_accepted'),
    ('privacy'::text, u.raw_user_meta_data ->> 'fitmate_privacy_version', u.raw_user_meta_data ->> 'fitmate_privacy_accepted'),
    ('ai_processing'::text, u.raw_user_meta_data ->> 'fitmate_ai_processing_version', u.raw_user_meta_data ->> 'fitmate_ai_processing_accepted')
) as consent(consent_type, document_version, accepted)
where coalesce(consent.accepted::boolean, false)
  and nullif(consent.document_version, '') is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists billing_transactions_set_updated_at on public.billing_transactions;
create trigger billing_transactions_set_updated_at
before update on public.billing_transactions
for each row execute function public.set_updated_at();

drop trigger if exists plan_generation_usage_set_updated_at on public.plan_generation_usage;
create trigger plan_generation_usage_set_updated_at
before update on public.plan_generation_usage
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: users may read only their own commercial and generation records.
-- All writes happen through trusted server routes or security-definer functions.
-- ---------------------------------------------------------------------------

alter table public.user_subscriptions enable row level security;
alter table public.billing_transactions enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.plan_generation_usage enable row level security;
alter table public.plan_generation_reservations enable row level security;
alter table public.workout_plan_versions enable row level security;
alter table public.user_consents enable row level security;

drop policy if exists user_subscriptions_owner_select on public.user_subscriptions;
create policy user_subscriptions_owner_select
on public.user_subscriptions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists billing_transactions_owner_select on public.billing_transactions;
create policy billing_transactions_owner_select
on public.billing_transactions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists plan_generation_usage_owner_select on public.plan_generation_usage;
create policy plan_generation_usage_owner_select
on public.plan_generation_usage for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists workout_plan_versions_owner_select on public.workout_plan_versions;
create policy workout_plan_versions_owner_select
on public.workout_plan_versions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_consents_owner_all on public.user_consents;
create policy user_consents_owner_all
on public.user_consents for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.user_subscriptions from anon;
revoke all on public.billing_transactions from anon;
revoke all on public.billing_webhook_events from anon, authenticated;
revoke all on public.plan_generation_usage from anon;
revoke all on public.plan_generation_reservations from anon, authenticated;
revoke all on public.workout_plan_versions from anon;
revoke all on public.user_consents from anon;

revoke all on function public.reserve_plan_generation(uuid) from public, anon, authenticated;
revoke all on function public.finalize_plan_generation(uuid) from public, anon, authenticated;
revoke all on function public.release_plan_generation(uuid) from public, anon, authenticated;
revoke all on function public.complete_plan_generation(uuid, bigint, jsonb, text, text, smallint, text) from public, anon, authenticated;
grant execute on function public.reserve_plan_generation(uuid) to service_role;
grant execute on function public.finalize_plan_generation(uuid) to service_role;
grant execute on function public.release_plan_generation(uuid) to service_role;
grant execute on function public.complete_plan_generation(uuid, bigint, jsonb, text, text, smallint, text) to service_role;

grant select on public.user_subscriptions to authenticated;
grant select on public.billing_transactions to authenticated;
grant select on public.plan_generation_usage to authenticated;
grant select on public.workout_plan_versions to authenticated;
grant select, insert on public.user_consents to authenticated;

comment on table public.user_subscriptions is 'Authoritative local subscription state synchronized from Xendit webhooks.';
comment on table public.billing_webhook_events is 'Idempotency ledger for verified Xendit webhook deliveries.';
comment on table public.plan_generation_usage is 'Lifetime free plan-generation usage. Free accounts may complete at most two generations.';
comment on table public.plan_generation_reservations is 'Short-lived server reservations preventing concurrent requests from bypassing generation limits.';
comment on table public.workout_plan_versions is 'Immutable history of every successfully generated workout plan.';

commit;

-- ============================================================================
-- 202607300010_ai_feature_entitlements.sql
-- ============================================================================
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

-- ============================================================================
-- 202607300011_billing_checkout_lock.sql
-- ============================================================================
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

-- ============================================================================
-- 202607300012_atomic_ai_completions.sql
-- ============================================================================
begin;

-- Persist a generated workout plan and consume its reserved generation quota in
-- one database transaction. A failure rolls back both the plan mutation and the
-- quota/version update.
create or replace function public.complete_generated_workout_plan(
  p_reservation_id uuid,
  p_name text,
  p_description text,
  p_goal text,
  p_level text,
  p_days_per_week smallint,
  p_plan jsonb,
  p_generated_by_model text
)
returns table (
  workout_plan_id bigint,
  save_action text,
  entitlement text,
  free_used integer,
  free_limit integer,
  total_generated integer,
  version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.plan_generation_reservations%rowtype;
  v_plan_id bigint;
  v_action text;
  v_completion record;
begin
  select *
  into v_reservation
  from public.plan_generation_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'generation reservation not found';
  end if;

  if auth.uid() is not null and auth.uid() <> v_reservation.user_id then
    raise exception 'not authorized';
  end if;

  if v_reservation.status = 'completed' then
    select wp.id into v_plan_id
    from public.workout_plans wp
    where wp.user_id = v_reservation.user_id;
    v_action := 'unchanged';
  else
    if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then
      raise exception 'generation reservation is no longer active';
    end if;

    select case when exists (
      select 1 from public.workout_plans wp
      where wp.user_id = v_reservation.user_id
    ) then 'update' else 'create' end
    into v_action;

    insert into public.workout_plans (
      user_id,
      name,
      description,
      goal,
      level,
      days_per_week,
      status,
      plan,
      created_at,
      updated_at
    ) values (
      v_reservation.user_id,
      p_name,
      p_description,
      p_goal,
      p_level,
      p_days_per_week,
      'active',
      p_plan,
      now(),
      now()
    )
    on conflict (user_id) do update
    set
      name = excluded.name,
      description = excluded.description,
      goal = excluded.goal,
      level = excluded.level,
      days_per_week = excluded.days_per_week,
      status = 'active',
      plan = excluded.plan,
      updated_at = now()
    returning id into v_plan_id;
  end if;

  select *
  into v_completion
  from public.complete_plan_generation(
    p_reservation_id,
    v_plan_id,
    p_plan,
    p_goal,
    p_level,
    p_days_per_week,
    p_generated_by_model
  );

  return query
  select
    v_plan_id,
    v_action,
    v_completion.entitlement::text,
    v_completion.free_used::integer,
    v_completion.free_limit::integer,
    v_completion.total_generated::integer,
    v_completion.version_id::uuid,
    v_completion.version_number::integer;
end;
$$;

-- Persist the successful AI output and consume its reservation atomically.
-- Nutrition scans also create the analysis and journal entry in the same
-- transaction, so users never lose quota without receiving a saved result.
create or replace function public.complete_ai_feature_result(
  p_reservation_id uuid,
  p_user_content text,
  p_assistant_content text,
  p_user_metadata jsonb default '{}'::jsonb,
  p_assistant_metadata jsonb default '{}'::jsonb,
  p_analysis jsonb default null,
  p_image_name text default null,
  p_note text default null
)
returns table (
  plan text,
  feature text,
  used integer,
  usage_limit integer,
  remaining integer,
  resets_at timestamptz,
  nutrition_analysis_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.ai_feature_usage_reservations%rowtype;
  v_completion record;
  v_analysis_id uuid;
  v_food_detected boolean := false;
  v_dish_name text;
  v_summary text;
  v_confidence text;
  v_calories numeric(8,2) := 0;
  v_protein numeric(8,2) := 0;
  v_carbs numeric(8,2) := 0;
  v_fat numeric(8,2) := 0;
  v_fiber numeric(8,2) := 0;
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
    select * into v_completion
    from public.finalize_ai_feature_usage(p_reservation_id);

    return query
    select v_completion.plan::text,
      v_completion.feature::text,
      v_completion.used::integer,
      v_completion.usage_limit::integer,
      v_completion.remaining::integer,
      v_completion.resets_at::timestamptz,
      null::uuid;
    return;
  end if;

  if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then
    raise exception 'AI usage reservation is no longer active';
  end if;

  insert into public.coach_messages (
    user_id, role, mode, content, metadata
  ) values
    (
      v_reservation.user_id,
      'user',
      v_reservation.feature,
      p_user_content,
      coalesce(p_user_metadata, '{}'::jsonb)
    ),
    (
      v_reservation.user_id,
      'assistant',
      v_reservation.feature,
      p_assistant_content,
      coalesce(p_assistant_metadata, '{}'::jsonb)
    );

  if v_reservation.feature = 'nutrition' then
    if p_analysis is null then
      raise exception 'nutrition analysis payload is required';
    end if;

    v_food_detected := coalesce((p_analysis ->> 'food_detected')::boolean, false);
    v_dish_name := coalesce(nullif(p_analysis ->> 'dish_name', ''), 'Hasil scan makanan');
    v_summary := coalesce(nullif(p_analysis ->> 'summary', ''), p_assistant_content);
    v_confidence := case
      when p_analysis ->> 'confidence' in ('low', 'medium', 'high')
        then p_analysis ->> 'confidence'
      else 'low'
    end;
    v_calories := least(20000, greatest(0, coalesce(nullif(p_analysis #>> '{totals,calories}', '')::numeric, 0)));
    v_protein := least(2000, greatest(0, coalesce(nullif(p_analysis #>> '{totals,protein_g}', '')::numeric, 0)));
    v_carbs := least(3000, greatest(0, coalesce(nullif(p_analysis #>> '{totals,carbs_g}', '')::numeric, 0)));
    v_fat := least(2000, greatest(0, coalesce(nullif(p_analysis #>> '{totals,fat_g}', '')::numeric, 0)));
    v_fiber := least(500, greatest(0, coalesce(nullif(p_analysis #>> '{totals,fiber_g}', '')::numeric, 0)));

    insert into public.nutrition_analyses (
      user_id,
      image_name,
      dish_name,
      summary,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      confidence,
      analysis
    ) values (
      v_reservation.user_id,
      p_image_name,
      v_dish_name,
      v_summary,
      v_calories,
      v_protein,
      v_carbs,
      v_fat,
      v_fiber,
      v_confidence,
      p_analysis
    ) returning id into v_analysis_id;

    if v_food_detected then
      insert into public.nutrition_entries (
        user_id,
        nutrition_analysis_id,
        meal_type,
        food_name,
        serving_description,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        source,
        notes
      ) values (
        v_reservation.user_id,
        v_analysis_id,
        'meal',
        v_dish_name,
        left(coalesce((p_analysis -> 'items')::text, ''), 1000),
        v_calories,
        v_protein,
        v_carbs,
        v_fat,
        v_fiber,
        'ai_scan',
        nullif(p_note, '')
      );
    end if;
  end if;

  select * into v_completion
  from public.finalize_ai_feature_usage(p_reservation_id);

  return query
  select v_completion.plan::text,
    v_completion.feature::text,
    v_completion.used::integer,
    v_completion.usage_limit::integer,
    v_completion.remaining::integer,
    v_completion.resets_at::timestamptz,
    v_analysis_id;
end;
$$;

revoke all on function public.complete_generated_workout_plan(uuid, text, text, text, text, smallint, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.complete_ai_feature_result(uuid, text, text, jsonb, jsonb, jsonb, text, text)
  from public, anon, authenticated;

grant execute on function public.complete_generated_workout_plan(uuid, text, text, text, text, smallint, jsonb, text)
  to service_role;
grant execute on function public.complete_ai_feature_result(uuid, text, text, jsonb, jsonb, jsonb, text, text)
  to service_role;

commit;

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';

-- ==========================================================================
-- v14.50: billing consent types and Premium weekly plan-generation quota
-- ==========================================================================

begin;

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

  select * into v_usage
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

  select count(*)::integer into v_active_reservations
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

  select count(*)::integer into v_reserved_free
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
