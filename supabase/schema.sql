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

-- The server's clock, so a device whose clock is slow does not have every
-- edit silently rejected by the trigger below.
create or replace function public.server_now() returns timestamptz
  language sql stable as $$ select now() $$;


-- ===========================================================
-- 1. TASKS
-- ===========================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  notes text not null default '',
  due date,
  area text not null default '',           -- ''|agency|content|school|personal
  done boolean not null default false,
  done_date date,
  top_date date,                           -- the day this task is one of the Top 3
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tasks_due_idx on public.tasks (due) where deleted_at is null;
create index if not exists tasks_top_idx on public.tasks (top_date) where deleted_at is null;


-- ===========================================================
-- 2. LEADS (exist from the first reply; DMs sent live on days)
-- ===========================================================
-- Stage dates are stamped by the client the first time a stage is reached.
-- "Calls last 7 days" and "won this month" read these; the stage column is a
-- state and cannot answer when.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  business text not null default '',
  platform text not null default 'instagram',  -- instagram|tiktok|whatsapp|email|referral|other
  service text not null default 'web',         -- web|seo|both|other
  stage text not null default 'replied',       -- replied|call|proposal|won|lost
  value numeric(12,2) not null default 0,      -- USD
  notes text not null default '',
  follow_up_date date,
  replied_date date,
  call_date date,
  proposal_date date,
  won_date date,
  lost_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists leads_stage_idx on public.leads (stage) where deleted_at is null;
create index if not exists leads_won_idx on public.leads (won_date) where deleted_at is null;
create index if not exists leads_follow_idx on public.leads (follow_up_date) where deleted_at is null;


-- ===========================================================
-- 3. CONTENT
-- ===========================================================
-- posted_date is what the "videos posted today" counter reads. blog_date is
-- what "blog posts this week" reads. Neither is a counter of its own.
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  format text not null default 'other',    -- story|teach|proof|dayinlife|reaction|other
  stage text not null default 'idea',      -- idea|scripted|filmed|edited|posted
  link text not null default '',
  posted_date date,
  blog_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists content_stage_idx on public.content (stage) where deleted_at is null;
create index if not exists content_posted_idx on public.content (posted_date) where deleted_at is null;


-- ===========================================================
-- 4. DAYS (one row per app day, natural key = date)
-- ===========================================================
-- The client derives the uuid from the date (stableId in js/sync.js) so both
-- devices write the same row. The unique index is the safety net.
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  date date,
  dms_sent integer not null default 0,
  comm_minutes integer not null default 0,
  god_first boolean not null default false,
  exercise boolean not null default false,
  screen_minutes integer,
  checkin_done boolean not null default false,
  checkin_at timestamptz,
  dm_skip_reason text,                     -- notime|mood|notworth|other
  better boolean,
  journal text not null default '',
  focus_task_id uuid,
  focus_started_at timestamptz,
  focus_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists days_date_key on public.days (date) where deleted_at is null;


-- ===========================================================
-- 5. HOLDS (purchases on a 30-day hold)
-- ===========================================================
create table if not exists public.holds (
  id uuid primary key default gen_random_uuid(),
  item text not null default '',
  price numeric(12,2) not null default 0,  -- USD
  hold_until date,
  status text not null default 'holding',  -- holding|bought|dropped
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- ===========================================================
-- 6. SETTINGS (singleton, id = stableId("settings"))
-- ===========================================================
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  target_dms integer not null default 30,
  target_videos integer not null default 2,
  target_comm integer not null default 75,
  screen_cap integer not null default 60,
  target_blogs integer not null default 5,
  goal_amount numeric(12,2) not null default 5000,
  goal_start date,
  goal_end date,
  focus_formats jsonb not null default '[]'::jsonb,
  default_deal_value numeric(12,2) not null default 1500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- ===========================================================
-- LAST-WRITE-WINS, ENFORCED BY THE DATABASE
-- ===========================================================
create or replace function public.reject_stale_write() returns trigger
language plpgsql as $$
begin
  if NEW.updated_at < OLD.updated_at then return null; end if;
  return NEW;
end $$;

do $$
declare t text;
begin
  foreach t in array array['tasks','leads','content','days','holds','settings'] loop

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


-- ===========================================================
-- OPTIONAL HOUSEKEEPING, by hand only. Purge tombstones older than the
-- longest any device has been offline, or that device resurrects the row.
-- ===========================================================
-- delete from public.tasks    where deleted_at < now() - interval '90 days';
-- delete from public.leads    where deleted_at < now() - interval '90 days';
-- delete from public.content  where deleted_at < now() - interval '90 days';
-- delete from public.days     where deleted_at < now() - interval '90 days';
-- delete from public.holds    where deleted_at < now() - interval '90 days';
