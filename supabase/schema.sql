-- ===========================================================
-- Track. Supabase setup. Run this ONCE in the SQL Editor of the project you
-- paste into Settings: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Every statement is idempotent. Re-running the file is safe and is how you
-- apply changes after adding a column.
--
-- Same architecture as Agency CRM: normalized tables, soft deletes only,
-- last-write-wins enforced by a trigger on client-stamped updated_at.
-- NOTHING IS EVER HARD DELETED. `deleted_at is not null` is a tombstone.
--
-- No Supabase Auth. The publishable key gets full read/write via RLS, a
-- casual deterrent behind the app's PIN. The URL and key are typed into the
-- app's Settings page and stored in that device's localStorage, never in the
-- deployed source.
--
-- KEEP IN SYNC WITH the TABLES registry in js/sync.js. A field that exists in
-- the registry but not here makes every write to that table fail (PGRST204).
-- ===========================================================

create extension if not exists pgcrypto;

create or replace function public.server_now() returns timestamptz
  language sql stable as $$ select now() $$;


-- 1. TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  notes text not null default '',
  due date,
  area text not null default '',           -- ''|agency|content|school|personal
  done boolean not null default false,
  done_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tasks_due_idx on public.tasks (due) where deleted_at is null;


-- 2. CONTENT (the scripts)
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  format text not null default 'other',    -- story|teach|proof|dayinlife|reaction|other
  stage text not null default 'scripted',  -- scripted|filmed|edited|posted
  link text not null default '',
  posted_date date,
  blog_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists content_posted_idx on public.content (posted_date) where deleted_at is null;


-- 3. DAYS (one row per app day, natural key = date, uuid from stableId)
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  date date,
  god_first boolean not null default false,
  dms_done boolean not null default false,
  videos_done boolean not null default false,
  comm_done boolean not null default false,
  exercise boolean not null default false,
  blog_done boolean not null default false,
  screen_minutes integer,
  checkin_done boolean not null default false,
  checkin_at timestamptz,
  dm_skip_reason text,                     -- notime|mood|notworth|other
  better boolean,
  journal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists days_date_key on public.days (date) where deleted_at is null;


-- 4. GOALS
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  amount numeric(12,2) not null default 0,   -- USD, 0 when the goal is not money
  current numeric(12,2) not null default 0,
  deadline date,
  done boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- 5. EXERCISE PLAN (one row per weekday, 0 = Monday, uuid from stableId)
create table if not exists public.exercise_plan (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null default 0,
  label text not null default '',          -- Upper, Legs, Cardio
  rest boolean not null default false,
  video_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists exercise_plan_key on public.exercise_plan (weekday) where deleted_at is null;


-- 6. CONTENT PLAN (which weekdays are content days)
create table if not exists public.content_plan (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null default 0,
  do_script boolean not null default false,
  do_film boolean not null default false,
  do_edit boolean not null default false,
  do_post boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists content_plan_key on public.content_plan (weekday) where deleted_at is null;


-- 7. HOLDS (purchases on a 30-day hold)
create table if not exists public.holds (
  id uuid primary key default gen_random_uuid(),
  item text not null default '',
  price numeric(12,2) not null default 0,
  hold_until date,
  status text not null default 'holding',  -- holding|bought|dropped
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- 8. SETTINGS (singleton, id = stableId("settings"))
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  target_dms integer not null default 30,
  target_videos integer not null default 2,
  target_comm integer not null default 75,
  screen_cap integer not null default 60,
  target_blogs integer not null default 5,
  weekly_mix jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- LAST-WRITE-WINS, ENFORCED BY THE DATABASE
create or replace function public.reject_stale_write() returns trigger
language plpgsql as $$
begin
  if NEW.updated_at < OLD.updated_at then return null; end if;
  return NEW;
end $$;

do $$
declare t text;
begin
  foreach t in array array['tasks','content','days','goals','exercise_plan','content_plan','holds','settings'] loop

    execute format('drop trigger if exists reject_stale_write on public.%I', t);
    execute format('create trigger reject_stale_write before update on public.%I
                    for each row execute function public.reject_stale_write()', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "anon full access" on public.%I', t);
    execute format('create policy "anon full access" on public.%I
                    for all to anon using (true) with check (true)', t);

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;

  end loop;
end $$;
