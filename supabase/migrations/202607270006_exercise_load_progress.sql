begin;

alter table public.workout_exercise_logs
  add column if not exists original_exercise_name text,
  add column if not exists equipment_unavailable boolean not null default false,
  add column if not exists load_kg numeric(7, 2);

update public.workout_exercise_logs
set original_exercise_name = exercise_name
where original_exercise_name is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercise_logs_load_kg_check'
      and conrelid = 'public.workout_exercise_logs'::regclass
  ) then
    alter table public.workout_exercise_logs
      add constraint workout_exercise_logs_load_kg_check
      check (load_kg is null or (load_kg >= 0 and load_kg <= 1000));
  end if;
end
$$;

create index if not exists workout_exercise_logs_load_progress_idx
  on public.workout_exercise_logs (
    user_id,
    exercise_name,
    completed_at desc
  )
  where completed = true and load_kg is not null;

comment on column public.workout_exercise_logs.original_exercise_name is
  'Exercise from the generated plan before an equipment-based substitution.';

comment on column public.workout_exercise_logs.exercise_name is
  'Exercise actually performed by the user.';

comment on column public.workout_exercise_logs.load_kg is
  'Optional external or added load used for the exercise, in kilograms.';

commit;
