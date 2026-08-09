begin;

create extension if not exists pgcrypto;

-- =====================================================
-- PROFILE SAFETY + PERSONALIZATION
-- =====================================================

alter table public.fitness_profiles
  add column if not exists injury_history text[] not null default '{}',
  add column if not exists movement_limitations text[] not null default '{}',
  add column if not exists pain_areas text[] not null default '{}',
  add column if not exists available_equipment text[] not null default '{}',
  add column if not exists preferred_training_time time,
  add column if not exists timezone text not null default 'Asia/Jakarta',
  add column if not exists medical_clearance_required boolean not null default false;

-- =====================================================
-- DAILY READINESS
-- =====================================================

create table if not exists public.readiness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default ((now() at time zone 'Asia/Jakarta')::date),
  sleep_hours numeric(4, 2) not null check (sleep_hours between 0 and 24),
  energy smallint not null check (energy between 1 and 10),
  soreness smallint not null check (soreness between 1 and 10),
  stress smallint not null check (stress between 1 and 10),
  pain_level smallint not null default 0 check (pain_level between 0 and 10),
  pain_areas text[] not null default '{}',
  available_minutes smallint not null default 60 check (available_minutes between 10 and 300),
  readiness_score smallint not null check (readiness_score between 0 and 100),
  recommendation text not null,
  volume_modifier numeric(5, 2) not null default 1 check (volume_modifier between 0.25 and 1.25),
  intensity_modifier numeric(5, 2) not null default 1 check (intensity_modifier between 0.25 and 1.25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists readiness_logs_user_date_idx
  on public.readiness_logs (user_id, log_date desc);

-- =====================================================
-- SET-BY-SET WORKOUT LOGGING
-- =====================================================

create table if not exists public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  set_number smallint not null check (set_number between 1 and 30),
  set_type text not null default 'working'
    check (set_type in ('warmup', 'working', 'failure', 'drop', 'backoff')),
  load_kg numeric(7, 2) check (load_kg between 0 and 1500),
  reps smallint check (reps between 0 and 500),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  distance_m numeric(10, 2) check (distance_m between 0 and 500000),
  rir smallint check (rir between 0 and 10),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  completed boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Older FitMate databases used bigint IDs for workout sessions/logs,
-- while newer installs use UUIDs. Add every relation using the real
-- parent-column type so this migration is safe for both schemas.
do $$
declare
  parent_type text;
  current_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.workout_sessions'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if parent_type is null then
    raise exception 'public.workout_sessions.id was not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_set_logs'
      and column_name = 'workout_session_id'
  ) then
    execute format(
      'alter table public.workout_set_logs add column workout_session_id %s',
      parent_type
    );
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.workout_set_logs'::regclass
      and a.attname = 'workout_session_id'
      and not a.attisdropped;

    if current_type <> parent_type then
      if exists (select 1 from public.workout_set_logs limit 1) then
        raise exception
          'workout_set_logs.workout_session_id type % does not match workout_sessions.id type %. Table contains data; migrate it explicitly first.',
          current_type, parent_type;
      end if;
      execute format(
        'alter table public.workout_set_logs alter column workout_session_id type %s using null::%s',
        parent_type,
        parent_type
      );
    end if;
  end if;

  execute 'alter table public.workout_set_logs alter column workout_session_id set not null';

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_set_logs'::regclass
      and conname = 'workout_set_logs_workout_session_id_fkey'
  ) then
    execute 'alter table public.workout_set_logs add constraint workout_set_logs_workout_session_id_fkey foreign key (workout_session_id) references public.workout_sessions(id) on delete cascade';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.workout_exercise_logs'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if parent_type is null then
    raise exception 'public.workout_exercise_logs.id was not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_set_logs'
      and column_name = 'workout_exercise_log_id'
  ) then
    execute format(
      'alter table public.workout_set_logs add column workout_exercise_log_id %s',
      parent_type
    );
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.workout_set_logs'::regclass
      and a.attname = 'workout_exercise_log_id'
      and not a.attisdropped;

    if current_type <> parent_type then
      if exists (select 1 from public.workout_set_logs limit 1) then
        raise exception
          'workout_set_logs.workout_exercise_log_id type % does not match workout_exercise_logs.id type %. Table contains data; migrate it explicitly first.',
          current_type, parent_type;
      end if;
      execute format(
        'alter table public.workout_set_logs alter column workout_exercise_log_id type %s using null::%s',
        parent_type,
        parent_type
      );
    end if;
  end if;

  execute 'alter table public.workout_set_logs alter column workout_exercise_log_id set not null';

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_set_logs'::regclass
      and conname = 'workout_set_logs_workout_exercise_log_id_fkey'
  ) then
    execute 'alter table public.workout_set_logs add constraint workout_set_logs_workout_exercise_log_id_fkey foreign key (workout_exercise_log_id) references public.workout_exercise_logs(id) on delete cascade';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.exercises'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if parent_type is null then
    raise exception 'public.exercises.id was not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_set_logs'
      and column_name = 'exercise_id'
  ) then
    execute format(
      'alter table public.workout_set_logs add column exercise_id %s',
      parent_type
    );
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.workout_set_logs'::regclass
      and a.attname = 'exercise_id'
      and not a.attisdropped;

    if current_type <> parent_type then
      if exists (select 1 from public.workout_set_logs limit 1) then
        raise exception
          'workout_set_logs.exercise_id type % does not match exercises.id type %. Table contains data; migrate it explicitly first.',
          current_type, parent_type;
      end if;
      execute format(
        'alter table public.workout_set_logs alter column exercise_id type %s using null::%s',
        parent_type,
        parent_type
      );
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_set_logs'::regclass
      and conname = 'workout_set_logs_exercise_id_fkey'
  ) then
    execute 'alter table public.workout_set_logs add constraint workout_set_logs_exercise_id_fkey foreign key (exercise_id) references public.exercises(id) on delete set null';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_set_logs'::regclass
      and conname = 'workout_set_logs_workout_exercise_log_id_set_number_key'
  ) then
    execute 'alter table public.workout_set_logs add constraint workout_set_logs_workout_exercise_log_id_set_number_key unique (workout_exercise_log_id, set_number)';
  end if;
end $$;

create index if not exists workout_set_logs_session_idx
  on public.workout_set_logs (workout_session_id, set_number);

create index if not exists workout_set_logs_user_exercise_idx
  on public.workout_set_logs (user_id, exercise_name, created_at desc);

-- =====================================================
-- ADAPTIVE PROGRESSION
-- =====================================================

create table if not exists public.adaptive_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  recommended_load_kg numeric(7, 2),
  recommended_reps_min smallint check (recommended_reps_min between 1 and 100),
  recommended_reps_max smallint check (recommended_reps_max between 1 and 100),
  recommended_sets smallint check (recommended_sets between 1 and 20),
  action text not null check (action in ('increase', 'maintain', 'reduce', 'deload', 'technique')),
  reason text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  is_applied boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
declare
  parent_type text;
  current_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.exercises'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'adaptive_recommendations'
      and column_name = 'exercise_id'
  ) then
    execute format('alter table public.adaptive_recommendations add column exercise_id %s', parent_type);
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.adaptive_recommendations'::regclass
      and a.attname = 'exercise_id'
      and not a.attisdropped;
    if current_type <> parent_type then
      if exists (select 1 from public.adaptive_recommendations limit 1) then
        raise exception 'adaptive_recommendations.exercise_id type % does not match exercises.id type %. Table contains data.', current_type, parent_type;
      end if;
      execute format('alter table public.adaptive_recommendations alter column exercise_id type %s using null::%s', parent_type, parent_type);
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.adaptive_recommendations'::regclass
      and conname = 'adaptive_recommendations_exercise_id_fkey'
  ) then
    execute 'alter table public.adaptive_recommendations add constraint adaptive_recommendations_exercise_id_fkey foreign key (exercise_id) references public.exercises(id) on delete set null';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.workout_sessions'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'adaptive_recommendations'
      and column_name = 'source_session_id'
  ) then
    execute format('alter table public.adaptive_recommendations add column source_session_id %s', parent_type);
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.adaptive_recommendations'::regclass
      and a.attname = 'source_session_id'
      and not a.attisdropped;
    if current_type <> parent_type then
      if exists (select 1 from public.adaptive_recommendations limit 1) then
        raise exception 'adaptive_recommendations.source_session_id type % does not match workout_sessions.id type %. Table contains data.', current_type, parent_type;
      end if;
      execute format('alter table public.adaptive_recommendations alter column source_session_id type %s using null::%s', parent_type, parent_type);
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.adaptive_recommendations'::regclass
      and conname = 'adaptive_recommendations_source_session_id_fkey'
  ) then
    execute 'alter table public.adaptive_recommendations add constraint adaptive_recommendations_source_session_id_fkey foreign key (source_session_id) references public.workout_sessions(id) on delete set null';
  end if;
end $$;

create index if not exists adaptive_recommendations_user_exercise_idx
  on public.adaptive_recommendations (user_id, exercise_name, created_at desc);

-- =====================================================
-- BODY MEASUREMENTS + PROGRESS PHOTOS
-- =====================================================

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6, 2) check (weight_kg between 1 and 499),
  body_fat_pct numeric(5, 2) check (body_fat_pct between 1 and 75),
  waist_cm numeric(6, 2) check (waist_cm between 20 and 300),
  chest_cm numeric(6, 2) check (chest_cm between 20 and 300),
  arm_cm numeric(6, 2) check (arm_cm between 10 and 150),
  thigh_cm numeric(6, 2) check (thigh_cm between 10 and 200),
  hips_cm numeric(6, 2) check (hips_cm between 20 and 300),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_at desc);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  pose text not null default 'front' check (pose in ('front', 'side', 'back', 'other')),
  captured_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_date_idx
  on public.progress_photos (user_id, captured_at desc);

-- =====================================================
-- NUTRITION JOURNAL
-- =====================================================

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text not null default 'meal'
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'meal')),
  food_name text not null,
  serving_description text,
  calories numeric(8, 2) not null default 0 check (calories between 0 and 20000),
  protein_g numeric(8, 2) not null default 0 check (protein_g between 0 and 2000),
  carbs_g numeric(8, 2) not null default 0 check (carbs_g between 0 and 3000),
  fat_g numeric(8, 2) not null default 0 check (fat_g between 0 and 2000),
  fiber_g numeric(8, 2) not null default 0 check (fiber_g between 0 and 500),
  source text not null default 'manual' check (source in ('manual', 'ai_scan')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  parent_type text;
  current_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.nutrition_analyses'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if parent_type is null then
    raise exception 'public.nutrition_analyses.id was not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nutrition_entries'
      and column_name = 'nutrition_analysis_id'
  ) then
    execute format('alter table public.nutrition_entries add column nutrition_analysis_id %s', parent_type);
  else
    select format_type(a.atttypid, a.atttypmod)
      into current_type
    from pg_attribute a
    where a.attrelid = 'public.nutrition_entries'::regclass
      and a.attname = 'nutrition_analysis_id'
      and not a.attisdropped;
    if current_type <> parent_type then
      if exists (select 1 from public.nutrition_entries limit 1) then
        raise exception 'nutrition_entries.nutrition_analysis_id type % does not match nutrition_analyses.id type %. Table contains data.', current_type, parent_type;
      end if;
      execute format('alter table public.nutrition_entries alter column nutrition_analysis_id type %s using null::%s', parent_type, parent_type);
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nutrition_entries'::regclass
      and conname = 'nutrition_entries_nutrition_analysis_id_fkey'
  ) then
    execute 'alter table public.nutrition_entries add constraint nutrition_entries_nutrition_analysis_id_fkey foreign key (nutrition_analysis_id) references public.nutrition_analyses(id) on delete set null';
  end if;
end $$;

create index if not exists nutrition_entries_user_date_idx
  on public.nutrition_entries (user_id, logged_at desc);

create table if not exists public.nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories numeric(8, 2) not null default 2000 check (calories between 800 and 10000),
  protein_g numeric(8, 2) not null default 120 check (protein_g between 20 and 1000),
  carbs_g numeric(8, 2) not null default 250 check (carbs_g between 20 and 1500),
  fat_g numeric(8, 2) not null default 65 check (fat_g between 10 and 500),
  fiber_g numeric(8, 2) not null default 30 check (fiber_g between 5 and 150),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- REMINDERS + ACCOUNT CONTROL
-- =====================================================

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  workout_days smallint[] not null default '{1,3,5}',
  workout_time time not null default '18:00',
  timezone text not null default 'Asia/Jakarta',
  missed_workout boolean not null default true,
  weekly_review boolean not null default true,
  measurement_reminder boolean not null default true,
  notification_permission text not null default 'default'
    check (notification_permission in ('default', 'granted', 'denied', 'unsupported')),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  reason text,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id, requested_at desc);

-- =====================================================
-- UPDATE TIMESTAMPS
-- =====================================================

drop trigger if exists readiness_logs_set_updated_at on public.readiness_logs;
create trigger readiness_logs_set_updated_at
before update on public.readiness_logs
for each row execute function public.set_updated_at();

drop trigger if exists workout_set_logs_set_updated_at on public.workout_set_logs;
create trigger workout_set_logs_set_updated_at
before update on public.workout_set_logs
for each row execute function public.set_updated_at();

drop trigger if exists nutrition_entries_set_updated_at on public.nutrition_entries;
create trigger nutrition_entries_set_updated_at
before update on public.nutrition_entries
for each row execute function public.set_updated_at();

drop trigger if exists nutrition_targets_set_updated_at on public.nutrition_targets;
create trigger nutrition_targets_set_updated_at
before update on public.nutrition_targets
for each row execute function public.set_updated_at();

drop trigger if exists reminder_preferences_set_updated_at on public.reminder_preferences;
create trigger reminder_preferences_set_updated_at
before update on public.reminder_preferences
for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.readiness_logs enable row level security;
alter table public.workout_set_logs enable row level security;
alter table public.adaptive_recommendations enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.account_deletion_requests enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'readiness_logs',
    'workout_set_logs',
    'adaptive_recommendations',
    'body_measurements',
    'progress_photos',
    'nutrition_entries',
    'nutrition_targets',
    'reminder_preferences',
    'account_deletion_requests'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_owner_all',
      table_name
    );
  end loop;
end $$;

revoke all on public.readiness_logs,
  public.workout_set_logs,
  public.adaptive_recommendations,
  public.body_measurements,
  public.progress_photos,
  public.nutrition_entries,
  public.nutrition_targets,
  public.reminder_preferences,
  public.account_deletion_requests
from anon;

grant select, insert, update, delete on public.readiness_logs,
  public.workout_set_logs,
  public.adaptive_recommendations,
  public.body_measurements,
  public.progress_photos,
  public.nutrition_entries,
  public.nutrition_targets,
  public.reminder_preferences,
  public.account_deletion_requests
  to authenticated;

-- Private storage bucket for progress photos. The object path must start
-- with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_storage_owner_select on storage.objects;
create policy progress_photos_storage_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_storage_owner_insert on storage.objects;
create policy progress_photos_storage_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_storage_owner_update on storage.objects;
create policy progress_photos_storage_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_storage_owner_delete on storage.objects;
create policy progress_photos_storage_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on table public.readiness_logs is 'Daily sleep, energy, soreness, stress, pain and training-time readiness check.';
comment on table public.workout_set_logs is 'Set-by-set strength and conditioning log used for progressive overload recommendations.';
comment on table public.adaptive_recommendations is 'Deterministic pre-launch load and volume recommendations derived from completed sets.';
comment on table public.nutrition_entries is 'Editable daily food journal entries from manual input or AI meal scans.';
comment on table public.progress_photos is 'Private metadata for progress photos stored in the progress-photos bucket.';

commit;
