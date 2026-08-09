begin;

create extension if not exists pgcrypto;

create table if not exists public.jogging_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Jogging',
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null default 0
    check (duration_seconds >= 0),
  distance_meters double precision not null default 0
    check (distance_meters >= 0),
  average_pace_seconds_per_km double precision
    check (
      average_pace_seconds_per_km is null or
      average_pace_seconds_per_km > 0
    ),
  average_speed_kmh double precision not null default 0
    check (average_speed_kmh >= 0),
  calories_kcal double precision not null default 0
    check (calories_kcal >= 0),
  elevation_gain_meters double precision not null default 0
    check (elevation_gain_meters >= 0),
  weight_kg double precision not null default 70
    check (weight_kg between 20 and 400),
  route_points jsonb not null default '[]'::jsonb
    check (jsonb_typeof(route_points) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index if not exists jogging_sessions_user_started_idx
  on public.jogging_sessions (user_id, started_at desc);

create or replace function public.set_jogging_session_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jogging_sessions_set_updated_at
  on public.jogging_sessions;
create trigger jogging_sessions_set_updated_at
before update on public.jogging_sessions
for each row execute function public.set_jogging_session_updated_at();

alter table public.jogging_sessions enable row level security;

drop policy if exists jogging_sessions_owner_select
  on public.jogging_sessions;
create policy jogging_sessions_owner_select
on public.jogging_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists jogging_sessions_owner_insert
  on public.jogging_sessions;
create policy jogging_sessions_owner_insert
on public.jogging_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists jogging_sessions_owner_update
  on public.jogging_sessions;
create policy jogging_sessions_owner_update
on public.jogging_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists jogging_sessions_owner_delete
  on public.jogging_sessions;
create policy jogging_sessions_owner_delete
on public.jogging_sessions
for delete
to authenticated
using (auth.uid() = user_id);

revoke all on public.jogging_sessions from anon;
grant select, insert, update, delete
  on public.jogging_sessions to authenticated;

comment on table public.jogging_sessions is
  'Free GPS jogging activities with route, pace, distance, calorie estimate, and elevation summary.';
comment on column public.jogging_sessions.route_points is
  'Compacted GPS points. Treat as sensitive location data and expose only to the owning user.';

commit;
