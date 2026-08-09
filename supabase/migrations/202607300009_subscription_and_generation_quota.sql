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
end;
$$;

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
