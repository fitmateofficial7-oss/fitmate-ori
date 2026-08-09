# Supabase foreign-key compatibility fix

The pre-launch migration now detects the actual primary-key type used by the existing FitMate database before adding foreign keys.

Supported parent ID types:

- `public.workout_sessions.id`: `bigint` or `uuid`
- `public.workout_exercise_logs.id`: `bigint` or `uuid`
- `public.exercises.id`: `bigint` or `uuid`
- `public.nutrition_analyses.id`: `bigint` or `uuid`

This fixes PostgreSQL error `42804`, where a foreign-key column was declared as `uuid` while the referenced parent ID was `bigint`.

## How to apply

1. Open Supabase Dashboard → SQL Editor.
2. Create a new query.
3. Copy the full contents of `supabase/migrations/202607280008_prelaunch_features.sql` from this corrected package.
4. Run the whole file once.

The earlier failed migration was wrapped in `begin`/`commit`, so PostgreSQL should have rolled it back automatically. No manual table deletion is normally required.

## Optional diagnostic query

```sql
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name
from information_schema.columns c
where c.table_schema = 'public'
  and (c.table_name, c.column_name) in (
    ('workout_sessions', 'id'),
    ('workout_exercise_logs', 'id'),
    ('exercises', 'id'),
    ('nutrition_analyses', 'id')
  )
order by c.table_name;
```
