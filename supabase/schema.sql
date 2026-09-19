-- Family Hub — optional Supabase sync layer.
--
-- The app works fully offline with zero setup (see src/lib/store.ts —
-- everything lives in localStorage). Run this schema only if you want
-- points/tasks to sync across every family member's phone. Supabase's
-- free tier (Postgres + Auth + Storage + Realtime + Edge Functions) is
-- enough for a family for the lifetime of this project — see
-- docs/ARCHITECTURE.md "Storage & sync strategy" for the reasoning.
--
-- Permission model: there is no admin/member split. Every row's RLS
-- policy only checks "is this user a member of the same family" —
-- everyone can read and write everything that belongs to their family.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_rules jsonb not null default '{"difficultyDefaults":{"easy":15,"normal":30,"hard":70,"epic":150}}',
  notification_rules jsonb not null default json_build_object(
    'notifyOnComplete', true,
    'notifyOnRefuse', true,
    'notifyOnPostpone', false,
    'notifyOnMissed', true,
    'notifyOnBadge', true,
    'notifyOnReward', true,
    'maxAutoReminders', 3,
    'followUpDelaysMinutes', json_build_array(60, 180)
  ),
  created_at timestamptz not null default now()
);

-- One row per person; auth_user_id is set once they actually sign in
-- (magic link / invite). A family can be used fully before anyone signs
-- in, since the local-first store seeds it — this table only matters
-- once you turn sync on.
create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  photo_url text,
  accent_color text not null default 'pink',
  points integer not null default 0,
  lifetime_points integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  completed_task_count integer not null default 0,
  timezone text not null default 'UTC',
  active boolean not null default true,
  created_at timestamptz not null default now()
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
  is_family_wide boolean not null default false,
  creator_id uuid not null references family_members(id) on delete cascade,
  recurrence jsonb not null default '{"type":"once"}',
  start_time time,
  due_time time,
  once_date date,
  has_deadline boolean not null default true,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who a (non-family-wide) task is assigned to. A family-wide task skips
-- this table entirely — `tasks.is_family_wide` means "every member".
create table task_assignments (
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  primary key (task_id, member_id)
);

-- One row per task per calendar day. Refusing/completing "today" never
-- touches tomorrow's row, so recurring tasks keep going.
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

create table task_events (
  id uuid primary key default gen_random_uuid(),
  task_occurrence_id uuid not null references task_occurrences(id) on delete cascade,
  member_id uuid references family_members(id) on delete set null,
  kind text not null, -- completed | refused | snoozed | missed
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade, -- null = global/built-in
  title text not null,
  category text not null,
  icon text not null,
  color text not null,
  points integer not null,
  difficulty text not null
);

-- ---------------------------------------------------------------------
-- Points, badges, rewards
-- ---------------------------------------------------------------------

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  task_occurrence_id uuid references task_occurrences(id) on delete set null,
  amount integer not null,
  type text not null check (type in ('task_completion', 'bonus', 'manual_adjustment', 'reward_redemption')),
  reason text,
  created_at timestamptz not null default now()
);

create table badges (
  id text primary key, -- e.g. 'streak-7', 'points-2', 'early-bird'
  name text not null,
  description text not null,
  icon text not null
);

create table user_badges (
  member_id uuid not null references family_members(id) on delete cascade,
  badge_id text not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (member_id, badge_id)
);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  icon text not null default 'gift',
  points_required integer not null,
  scope text not null check (scope in ('individual', 'family')),
  member_id uuid references family_members(id) on delete cascade,
  is_milestone boolean not null default false,
  redeemed boolean not null default false,
  redeemed_at timestamptz
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

-- ---------------------------------------------------------------------
-- Push notifications (see docs/ARCHITECTURE.md "Notifications")
-- ---------------------------------------------------------------------

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table notification_preferences (
  member_id uuid primary key references family_members(id) on delete cascade,
  notify_on_complete boolean not null default true,
  notify_on_refuse boolean not null default true,
  notify_on_postpone boolean not null default false,
  notify_on_missed boolean not null default true,
  notify_on_badge boolean not null default true,
  notify_on_reward boolean not null default true,
  sound_enabled boolean not null default true
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index idx_family_members_family on family_members(family_id);
create index idx_tasks_family on tasks(family_id);
create index idx_task_occurrences_task on task_occurrences(task_id);
create index idx_task_occurrences_scheduled on task_occurrences(scheduled_for);
create index idx_points_ledger_member on points_ledger(member_id);
create index idx_family_activity_family on family_activity(family_id, created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security — equal rights for every family member
-- ---------------------------------------------------------------------

alter table families enable row level security;
alter table family_members enable row level security;
alter table tasks enable row level security;
alter table task_assignments enable row level security;
alter table task_occurrences enable row level security;
alter table task_events enable row level security;
alter table points_ledger enable row level security;
alter table user_badges enable row level security;
alter table rewards enable row level security;
alter table family_activity enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_preferences enable row level security;

-- Helper: the family id(s) the current auth user belongs to.
create or replace function auth_family_ids() returns setof uuid as $$
  select family_id from family_members where auth_user_id = auth.uid()
$$ language sql stable security definer;

create policy "family: members can read/write their own family"
  on families for all
  using (id in (select auth_family_ids()))
  with check (id in (select auth_family_ids()));

create policy "family_members: read/write within your family"
  on family_members for all
  using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));

create policy "tasks: read/write within your family"
  on tasks for all
  using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));

create policy "task_assignments: read/write within your family"
  on task_assignments for all
  using (task_id in (select id from tasks where family_id in (select auth_family_ids())))
  with check (task_id in (select id from tasks where family_id in (select auth_family_ids())));

create policy "task_occurrences: read/write within your family"
  on task_occurrences for all
  using (task_id in (select id from tasks where family_id in (select auth_family_ids())))
  with check (task_id in (select id from tasks where family_id in (select auth_family_ids())));

create policy "task_events: read/write within your family"
  on task_events for all
  using (
    task_occurrence_id in (
      select o.id from task_occurrences o
      join tasks t on t.id = o.task_id
      where t.family_id in (select auth_family_ids())
    )
  );

create policy "points_ledger: read/write within your family"
  on points_ledger for all
  using (member_id in (select id from family_members where family_id in (select auth_family_ids())))
  with check (member_id in (select id from family_members where family_id in (select auth_family_ids())));

create policy "user_badges: read/write within your family"
  on user_badges for all
  using (member_id in (select id from family_members where family_id in (select auth_family_ids())))
  with check (member_id in (select id from family_members where family_id in (select auth_family_ids())));

create policy "rewards: read/write within your family"
  on rewards for all
  using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));

create policy "family_activity: read/write within your family"
  on family_activity for all
  using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));

create policy "push_subscriptions: owner within your family"
  on push_subscriptions for all
  using (member_id in (select id from family_members where family_id in (select auth_family_ids())))
  with check (member_id in (select id from family_members where family_id in (select auth_family_ids())));

create policy "notification_preferences: owner within your family"
  on notification_preferences for all
  using (member_id in (select id from family_members where family_id in (select auth_family_ids())))
  with check (member_id in (select id from family_members where family_id in (select auth_family_ids())));
