-- Family Hub — run once in Supabase → SQL Editor. Safe to run again.
--
-- 1. Fixes complete_task_occurrence: it never worked (see the comment in
--    it), so "Сделано" never reached the server.
-- 2. Adds per-person answers for shared tasks.

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
