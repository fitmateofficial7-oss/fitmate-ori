begin;

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  mode text not null default 'chat'
    check (mode in ('chat', 'nutrition')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_name text,
  dish_name text not null,
  summary text not null,
  calories numeric(8, 2) not null default 0,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  fiber_g numeric(8, 2) not null default 0,
  confidence text not null default 'low'
    check (confidence in ('low', 'medium', 'high')),
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_created_idx
  on public.coach_messages (user_id, created_at desc);

create index if not exists nutrition_analyses_user_created_idx
  on public.nutrition_analyses (user_id, created_at desc);

alter table public.coach_messages enable row level security;
alter table public.nutrition_analyses enable row level security;

drop policy if exists coach_messages_owner_all
  on public.coach_messages;
create policy coach_messages_owner_all
on public.coach_messages
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists nutrition_analyses_owner_all
  on public.nutrition_analyses;
create policy nutrition_analyses_owner_all
on public.nutrition_analyses
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.coach_messages from anon;
revoke all on public.nutrition_analyses from anon;

grant select, insert, update, delete
  on public.coach_messages,
     public.nutrition_analyses
  to authenticated;

commit;
