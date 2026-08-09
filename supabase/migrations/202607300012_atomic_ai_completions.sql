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
