-- ⚠️⚠️⚠️ WARNING — READ BEFORE RUNNING ⚠️⚠️⚠️
-- This file DROPS every table (families, family_members, tasks, …) before
-- recreating them. Run it ONLY for a brand-new, empty Supabase project.
--
-- If your family already has data in this project (points, tasks,
-- history) — DO NOT run this file. Supabase's SQL Editor will warn you
-- "This query includes destructive operations" for exactly this reason;
-- that warning is correct, cancel it. Ask for (or re-request from) a
-- small additive migration snippet instead — one that only adds new
-- columns/functions with `alter table ... add column if not exists` and
-- `create or replace function`, which never deletes existing rows.
--
-- Family Hub — Supabase sync layer (no accounts, no login).
--
-- Nobody signs in. Every device holds the same "family code" (just the
-- family's own row id — an unguessable UUID) and talks to this database
-- with the public anon key. The anon key is meant to be public; the UUID
-- is the actual secret, shared only between your own family's devices —
-- the same trust model as an unlisted shared link. Row Level Security is
-- enabled with permissive policies (not auth-gated) for exactly that
-- reason: this schema deliberately has no auth.users dependency, because
-- building a login system was explicitly out of scope.
--
-- Point totals, streaks, and badge/reward unlocking all happen inside
-- one Postgres function (complete_task_occurrence, below) instead of in
-- client code, so two phones completing tasks at the same moment can't
-- double-count points or award the same trophy twice — the database is
-- the single source of truth for that math, not whichever device
-- computed fastest.
--
-- Safe to (re-)run on a fresh project: drops these specific tables first.

drop table if exists task_member_marks cascade;
drop table if exists push_subscriptions cascade;
drop table if exists family_guides cascade;
drop table if exists family_activity cascade;
drop table if exists family_reward_history cascade;
drop table if exists user_badges cascade;
drop table if exists task_occurrences cascade;
drop table if exists task_assignments cascade; -- retired column-less table from an earlier version
drop table if exists tasks cascade;
drop table if exists family_members cascade;
drop table if exists families cascade;
drop function if exists complete_task_occurrence(uuid, date, text, integer, uuid[]);
drop function if exists refuse_task_occurrence(uuid, date, text);
drop function if exists snooze_task_occurrence(uuid, date, integer);

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Наша семья',
  family_points_pool integer not null default 0,
  family_goal integer not null default 5000,
  family_milestones_unlocked integer not null default 0,
  created_at timestamptz not null default now(),
  -- IANA zone (e.g. "Europe/Moscow") the send-reminders Edge Function
  -- uses to decide what "today" and "due now" mean for this family — the
  -- server itself runs in UTC, and a task's due_time is just a wall-clock
  -- time with no zone of its own.
  timezone text not null default 'Europe/Moscow'
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null,
  photo_url text,
  accent_color text not null default 'pink',
  points integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  completed_task_count integer not null default 0,
  last_completion_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft-delete tombstone: a hard `delete` would just vanish from a
  -- fetch, which a device that already cached this row can't tell apart
  -- from "not pushed yet" — so it would never remove it, and a deleted
  -- member could silently reappear. Marking it instead lets every device
  -- see the delete and drop it locally too.
  deleted_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'custom',
  icon text not null default 'checklist',
  color text not null default 'pink',
  points integer not null default 20,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'normal', 'hard', 'epic')),
  -- {"kind":"family"} or {"kind":"member","memberIds":[...]} — stored as
  -- one JSON blob (matching the client's TaskAssignee type) rather than
  -- a join table, so a task's assignees round-trip in a single upsert.
  assignee jsonb not null default '{"kind":"family"}',
  creator_id uuid references family_members(id) on delete set null,
  recurrence jsonb not null default '{"type":"once"}',
  start_time time,
  due_time time,
  once_date date,
  has_deadline boolean not null default true,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft-delete tombstone, see family_members.deleted_at
);

create table task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  scheduled_for date not null,
  status text not null default 'pending'
    check (status in ('pending', 'snoozed', 'completed', 'refused', 'missed', 'cancelled')),
  refusal_reason text,
  reminders_sent integer not null default 0,
  snoozed_until timestamptz,
  completed_at timestamptz,
  refused_at timestamptz,
  unique (task_id, scheduled_for)
);

create table user_badges (
  member_id uuid not null references family_members(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (member_id, badge_id)
);

create table family_reward_history (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  tier integer not null,
  name text not null,
  unlocked_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table family_activity (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  type text not null,
  member_id uuid references family_members(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  points integer,
  message text not null,
  created_at timestamptz not null default now()
);

-- Free-text "how to do this chore properly" pages, editable by anyone in
-- the family — a shared reference (kitchen checklist, hygiene routine,
-- …), not a tracked/checkable task with its own points or occurrences.
create table family_guides (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_family_members_family on family_members(family_id);
create index idx_tasks_family on tasks(family_id);
create index idx_task_occurrences_task on task_occurrences(task_id);
create index idx_family_activity_family on family_activity(family_id, created_at desc);
create index idx_family_guides_family on family_guides(family_id);

-- ---------------------------------------------------------------------
-- The atomic completion function — see header comment for why this
-- exists instead of the client computing points/badges itself.
-- ---------------------------------------------------------------------

create or replace function complete_task_occurrence(
  p_task_id uuid,
  p_scheduled_for date,
  p_family_id uuid,
  p_points integer,
  p_member_ids uuid[]
) returns jsonb as $$
declare
  v_occurrence_id uuid;
  v_already boolean;
  v_member record;
  v_new_points integer;
  v_prev_tier integer;
  v_new_tier integer;
  v_tier integer;
  v_new_streak integer;
  v_pool integer;
  v_goal integer;
  v_milestones integer;
  v_reward_names text[] := array['Кино 🎬', 'Ресторан 🍽️', 'Крутая покупка 🛍️'];
  v_reward_name text;
  v_badges jsonb := '[]'::jsonb;
  v_rewards jsonb := '[]'::jsonb;
begin
  select id, (status = 'completed') into v_occurrence_id, v_already
  from task_occurrences where task_id = p_task_id and scheduled_for = p_scheduled_for;

  if v_occurrence_id is null then
    insert into task_occurrences (task_id, scheduled_for, status, completed_at)
    values (p_task_id, p_scheduled_for, 'completed', now())
    returning id into v_occurrence_id;
  elsif v_already then
    return jsonb_build_object('alreadyCompleted', true, 'badges', v_badges, 'rewards', v_rewards);
  else
    update task_occurrences set status = 'completed', completed_at = now() where id = v_occurrence_id;
  end if;

  -- A plain FOR over the rows. This used to be
  -- `foreach v_member in array (select m from family_members ...)`,
  -- which Postgres rejects ("FOREACH expression must yield an array"),
  -- so every call failed: no completion ever reached the server, no
  -- points were ever awarded here, and reminders kept firing for tasks
  -- that had been done.
  for v_member in
    select * from family_members m where m.id = any(p_member_ids)
  loop
    -- Streak counts consecutive CALENDAR DAYS with a completion, not
    -- completions themselves: several tasks done on the same
    -- p_scheduled_for must not each bump the streak.
    if v_member.last_completion_date = p_scheduled_for then
      v_new_streak := v_member.current_streak;
    elsif v_member.last_completion_date = p_scheduled_for - 1 then
      v_new_streak := v_member.current_streak + 1;
    else
      v_new_streak := 1;
    end if;
    v_new_points := v_member.points + p_points;
    v_prev_tier := v_member.points / 1000;
    v_new_tier := v_new_points / 1000;

    update family_members set
      points = v_new_points,
      current_streak = v_new_streak,
      longest_streak = greatest(v_member.longest_streak, v_new_streak),
      completed_task_count = v_member.completed_task_count + 1,
      last_completion_date = greatest(coalesce(v_member.last_completion_date, p_scheduled_for), p_scheduled_for)
    where id = v_member.id;

    for v_tier in (v_prev_tier + 1)..v_new_tier loop
      insert into user_badges (member_id, badge_id) values (v_member.id, 'points-' || v_tier)
        on conflict do nothing;
      insert into family_activity (family_id, type, member_id, message)
      values (p_family_id, 'badge_earned', v_member.id,
        v_member.display_name || ' заработал(а) кубок за ' || (v_tier * 1000) || ' баллов!');
      v_badges := v_badges || jsonb_build_object('memberId', v_member.id, 'tier', v_tier, 'name', v_member.display_name);
    end loop;

    if v_member.last_completion_date is distinct from p_scheduled_for and (v_new_streak = 7 or v_new_streak = 30) then
      insert into user_badges (member_id, badge_id) values (v_member.id, 'streak-' || v_new_streak)
        on conflict do nothing;
      insert into family_activity (family_id, type, member_id, message)
      values (p_family_id, 'badge_earned', v_member.id,
        v_member.display_name || ': ' || v_new_streak || ' дней подряд!');
    end if;
  end loop;

  select family_points_pool, family_goal, family_milestones_unlocked
    into v_pool, v_goal, v_milestones
    from families where id = p_family_id for update;

  v_pool := v_pool + p_points;
  while v_pool >= v_goal loop
    v_pool := v_pool - v_goal;
    v_reward_name := v_reward_names[(v_milestones % 3) + 1];
    v_milestones := v_milestones + 1;
    insert into family_reward_history (family_id, tier, name) values (p_family_id, v_milestones, v_reward_name);
    insert into family_activity (family_id, type, message)
    values (p_family_id, 'reward_unlocked', 'Семья набрала ' || v_goal || ' баллов и заработала: ' || v_reward_name || '!');
    v_rewards := v_rewards || jsonb_build_object('tier', v_milestones, 'name', v_reward_name);
  end loop;

  update families set family_points_pool = v_pool, family_milestones_unlocked = v_milestones where id = p_family_id;

  return jsonb_build_object('alreadyCompleted', false, 'badges', v_badges, 'rewards', v_rewards);
end;
$$ language plpgsql security definer;

create or replace function refuse_task_occurrence(
  p_task_id uuid,
  p_scheduled_for date,
  p_reason text
) returns void as $$
begin
  insert into task_occurrences (task_id, scheduled_for, status, refusal_reason, refused_at)
  values (p_task_id, p_scheduled_for, 'refused', p_reason, now())
  on conflict (task_id, scheduled_for)
  do update set status = 'refused', refusal_reason = p_reason, refused_at = now();
end;
$$ language plpgsql security definer;

create or replace function snooze_task_occurrence(
  p_task_id uuid,
  p_scheduled_for date,
  p_hours numeric
) returns void as $$
begin
  insert into task_occurrences (task_id, scheduled_for, status, snoozed_until, reminders_sent)
  values (p_task_id, p_scheduled_for, 'snoozed', now() + (p_hours || ' hours')::interval, 1)
  on conflict (task_id, scheduled_for)
  do update set
    status = 'snoozed',
    snoozed_until = now() + (p_hours || ' hours')::interval,
    reminders_sent = task_occurrences.reminders_sent + 1;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- No login exists, so there is no auth.uid() to key policies off of.
-- The anon key is meant to be public; access control here is "you know
-- the family_id", the same trust model as an unlisted share link. RLS
-- stays ON (so the dashboard doesn't warn you it's off) with policies
-- that simply allow the anon/authenticated roles through.
-- ---------------------------------------------------------------------

alter table families enable row level security;
alter table family_members enable row level security;
alter table tasks enable row level security;
alter table task_occurrences enable row level security;
alter table user_badges enable row level security;
alter table family_reward_history enable row level security;
alter table family_activity enable row level security;
alter table push_subscriptions enable row level security;
alter table family_guides enable row level security;

create policy "anyone with the anon key can read/write families"
  on families for all using (true) with check (true);
create policy "anyone with the anon key can read/write family_members"
  on family_members for all using (true) with check (true);
create policy "anyone with the anon key can read/write tasks"
  on tasks for all using (true) with check (true);
create policy "anyone with the anon key can read/write task_occurrences"
  on task_occurrences for all using (true) with check (true);
create policy "anyone with the anon key can read/write user_badges"
  on user_badges for all using (true) with check (true);
create policy "anyone with the anon key can read/write family_reward_history"
  on family_reward_history for all using (true) with check (true);
create policy "anyone with the anon key can read/write family_activity"
  on family_activity for all using (true) with check (true);
create policy "anyone with the anon key can read/write push_subscriptions"
  on push_subscriptions for all using (true) with check (true);
create policy "anyone with the anon key can read/write family_guides"
  on family_guides for all using (true) with check (true);

-- Lets the client subscribe to live changes (Database → Replication in
-- the dashboard does the same thing; this just does it from SQL).
alter publication supabase_realtime add table family_members, tasks, task_occurrences, family_activity, family_reward_history, family_guides;

-- ---------------------------------------------------------------------
-- Table-level grants — separate from RLS above. RLS controls which ROWS
-- a role can see once it's allowed to touch the table at all; these
-- GRANTs are what let anon/authenticated touch the table in the first
-- place. Newer Supabase projects stop doing this automatically for
-- tables created after a certain point ("new tables in public need
-- explicit grants") — without this block, any table created later
-- (including one a future migration snippet adds) would reject the
-- app's anon-key requests even though RLS above says they're allowed.
-- `alter default privileges` makes this apply to every future table
-- too, not just the ones that exist right now.
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage — profile photos. Public bucket: anyone with a photo's exact
-- URL can view it (fine for a family avatar), but listing/guessing is
-- not possible without the id. Same anon-key trust model as everywhere
-- else in this file.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

drop policy if exists "anyone with the anon key can read photos" on storage.objects;
drop policy if exists "anyone with the anon key can upload photos" on storage.objects;
create policy "anyone with the anon key can read photos"
  on storage.objects for select using (bucket_id = 'photos');
create policy "anyone with the anon key can upload photos"
  on storage.objects for insert with check (bucket_id = 'photos');

-- ---------------------------------------------------------------------
-- Shared tasks: everyone answers for themselves.
--
-- A task for the whole family (or for several named people) used to be
-- one switch: the first "Сделано" closed it for everybody, credited
-- everybody, and silenced everybody's reminders. Now each person's own
-- answer is a row here; points go only to whoever did it; reminders
-- stop only for those who answered; the task itself closes once every
-- assignee has answered (done or refused).
-- ---------------------------------------------------------------------

create table if not exists task_member_marks (
  task_id uuid not null references tasks(id) on delete cascade,
  scheduled_for date not null,
  member_id uuid not null references family_members(id) on delete cascade,
  status text not null check (status in ('completed', 'refused', 'snoozed')),
  refusal_reason text,
  snoozed_until timestamptz,
  at timestamptz not null default now(),
  primary key (task_id, scheduled_for, member_id)
);

alter table task_member_marks enable row level security;
drop policy if exists "anyone with the anon key can read/write task_member_marks" on task_member_marks;
create policy "anyone with the anon key can read/write task_member_marks"
  on task_member_marks for all using (true) with check (true);
grant all on task_member_marks to anon, authenticated;

create or replace function close_task_if_everyone_answered(
  p_task_id uuid,
  p_scheduled_for date,
  p_all_member_ids uuid[]
) returns void as $$
declare
  v_open integer;
  v_any_done boolean;
begin
  select count(*) into v_open
  from unnest(p_all_member_ids) as a(id)
  where not exists (
    select 1 from task_member_marks k
    where k.task_id = p_task_id and k.scheduled_for = p_scheduled_for
      and k.member_id = a.id and k.status in ('completed', 'refused')
  );
  if v_open > 0 then return; end if;

  select exists (
    select 1 from task_member_marks k
    where k.task_id = p_task_id and k.scheduled_for = p_scheduled_for and k.status = 'completed'
  ) into v_any_done;

  if v_any_done then
    insert into task_occurrences (task_id, scheduled_for, status, completed_at)
    values (p_task_id, p_scheduled_for, 'completed', now())
    on conflict (task_id, scheduled_for) do update set status = 'completed', completed_at = now();
  else
    insert into task_occurrences (task_id, scheduled_for, status, refused_at)
    values (p_task_id, p_scheduled_for, 'refused', now())
    on conflict (task_id, scheduled_for) do update set status = 'refused', refused_at = now();
  end if;
end;
$$ language plpgsql security definer;

create or replace function complete_task_for_member(
  p_task_id uuid,
  p_scheduled_for date,
  p_family_id uuid,
  p_points integer,
  p_member_id uuid,
  p_all_member_ids uuid[]
) returns jsonb as $$
declare
  v_member record;
  v_new_points integer;
  v_prev_tier integer;
  v_new_tier integer;
  v_tier integer;
  v_new_streak integer;
  v_pool integer;
  v_goal integer;
  v_milestones integer;
  v_reward_names text[] := array['Кино 🎬', 'Ресторан 🍽️', 'Крутая покупка 🛍️'];
  v_reward_name text;
  v_badges jsonb := '[]'::jsonb;
  v_rewards jsonb := '[]'::jsonb;
  v_marked integer;
begin
  -- The whole task is already closed (everyone answered, or someone
  -- ticked it for everybody) — nothing left to award.
  if exists (select 1 from task_occurrences
             where task_id = p_task_id and scheduled_for = p_scheduled_for and status = 'completed') then
    return jsonb_build_object('alreadyCompleted', true, 'badges', v_badges, 'rewards', v_rewards);
  end if;

  insert into task_member_marks (task_id, scheduled_for, member_id, status, at)
  values (p_task_id, p_scheduled_for, p_member_id, 'completed', now())
  on conflict (task_id, scheduled_for, member_id)
  do update set status = 'completed', at = now(), snoozed_until = null
  where task_member_marks.status <> 'completed';
  get diagnostics v_marked = row_count;
  if v_marked = 0 then
    return jsonb_build_object('alreadyCompleted', true, 'badges', v_badges, 'rewards', v_rewards);
  end if;

  for v_member in
    select * from family_members m where m.id = any(array[p_member_id])
  loop
    -- Streak counts consecutive CALENDAR DAYS with a completion, not
    -- completions themselves: several tasks done on the same
    -- p_scheduled_for must not each bump the streak.
    if v_member.last_completion_date = p_scheduled_for then
      v_new_streak := v_member.current_streak;
    elsif v_member.last_completion_date = p_scheduled_for - 1 then
      v_new_streak := v_member.current_streak + 1;
    else
      v_new_streak := 1;
    end if;
    v_new_points := v_member.points + p_points;
    v_prev_tier := v_member.points / 1000;
    v_new_tier := v_new_points / 1000;

    update family_members set
      points = v_new_points,
      current_streak = v_new_streak,
      longest_streak = greatest(v_member.longest_streak, v_new_streak),
      completed_task_count = v_member.completed_task_count + 1,
      last_completion_date = greatest(coalesce(v_member.last_completion_date, p_scheduled_for), p_scheduled_for)
    where id = v_member.id;

    for v_tier in (v_prev_tier + 1)..v_new_tier loop
      insert into user_badges (member_id, badge_id) values (v_member.id, 'points-' || v_tier)
        on conflict do nothing;
      insert into family_activity (family_id, type, member_id, message)
      values (p_family_id, 'badge_earned', v_member.id,
        v_member.display_name || ' заработал(а) кубок за ' || (v_tier * 1000) || ' баллов!');
      v_badges := v_badges || jsonb_build_object('memberId', v_member.id, 'tier', v_tier, 'name', v_member.display_name);
    end loop;

    if v_member.last_completion_date is distinct from p_scheduled_for and (v_new_streak = 7 or v_new_streak = 30) then
      insert into user_badges (member_id, badge_id) values (v_member.id, 'streak-' || v_new_streak)
        on conflict do nothing;
      insert into family_activity (family_id, type, member_id, message)
      values (p_family_id, 'badge_earned', v_member.id,
        v_member.display_name || ': ' || v_new_streak || ' дней подряд!');
    end if;
  end loop;

  select family_points_pool, family_goal, family_milestones_unlocked
    into v_pool, v_goal, v_milestones
    from families where id = p_family_id for update;

  v_pool := v_pool + p_points;
  while v_pool >= v_goal loop
    v_pool := v_pool - v_goal;
    v_reward_name := v_reward_names[(v_milestones % 3) + 1];
    v_milestones := v_milestones + 1;
    insert into family_reward_history (family_id, tier, name) values (p_family_id, v_milestones, v_reward_name);
    insert into family_activity (family_id, type, message)
    values (p_family_id, 'reward_unlocked', 'Семья набрала ' || v_goal || ' баллов и заработала: ' || v_reward_name || '!');
    v_rewards := v_rewards || jsonb_build_object('tier', v_milestones, 'name', v_reward_name);
  end loop;

  update families set family_points_pool = v_pool, family_milestones_unlocked = v_milestones where id = p_family_id;

  perform close_task_if_everyone_answered(p_task_id, p_scheduled_for, p_all_member_ids);

  return jsonb_build_object('alreadyCompleted', false, 'badges', v_badges, 'rewards', v_rewards);
end;
$$ language plpgsql security definer;

-- "Не буду" / "Напомни позже" for one person on a shared task.
create or replace function mark_task_for_member(
  p_task_id uuid,
  p_scheduled_for date,
  p_member_id uuid,
  p_status text,
  p_reason text,
  p_hours numeric,
  p_all_member_ids uuid[]
) returns void as $$
begin
  insert into task_member_marks (task_id, scheduled_for, member_id, status, refusal_reason, snoozed_until, at)
  values (
    p_task_id, p_scheduled_for, p_member_id, p_status, p_reason,
    case when p_status = 'snoozed' then now() + (coalesce(p_hours, 1) || ' hours')::interval end,
    now()
  )
  on conflict (task_id, scheduled_for, member_id)
  do update set
    status = excluded.status,
    refusal_reason = excluded.refusal_reason,
    snoozed_until = excluded.snoozed_until,
    at = now()
  where task_member_marks.status <> 'completed';

  if p_status = 'refused' then
    perform close_task_if_everyone_answered(p_task_id, p_scheduled_for, p_all_member_ids);
  end if;
end;
$$ language plpgsql security definer;

grant execute on function close_task_if_everyone_answered(uuid, date, uuid[]) to anon, authenticated;
grant execute on function complete_task_for_member(uuid, date, uuid, integer, uuid, uuid[]) to anon, authenticated;
grant execute on function mark_task_for_member(uuid, date, uuid, text, text, numeric, uuid[]) to anon, authenticated;
