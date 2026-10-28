-- Family Hub — fines and appeals. Run once in Supabase → SQL Editor.
-- Safe to run again; changes no existing data.
--
-- Someone says a chore is done but it isn't really ("убрал учебники",
-- half are still on the floor): anyone else can fine them part or all of
-- that task's points, with a reason. The fined person can appeal; the
-- appeal is decided by a third family member (not the one who fined, not
-- the one fined). Cancelling a fine gives the points back.

create table if not exists task_penalties (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  task_title text not null,
  member_id uuid not null references family_members(id) on delete cascade,
  issued_by uuid references family_members(id) on delete set null,
  -- What was actually taken (never more than the person had), so
  -- cancelling gives back exactly that.
  points integer not null check (points >= 0),
  pool_taken integer not null default 0,
  reason text not null,
  status text not null default 'active' check (status in ('active', 'appealed', 'upheld', 'cancelled')),
  appeal_text text,
  resolved_by uuid references family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table task_penalties enable row level security;
drop policy if exists "anyone with the anon key can read/write task_penalties" on task_penalties;
create policy "anyone with the anon key can read/write task_penalties"
  on task_penalties for all using (true) with check (true);
grant all on task_penalties to anon, authenticated;

-- Fine: record it and take the points (never below zero) from the
-- person and from the family pool, in one transaction.
create or replace function issue_penalty(
  p_family_id uuid,
  p_task_id uuid,
  p_task_title text,
  p_member_id uuid,
  p_issued_by uuid,
  p_points integer,
  p_reason text
) returns uuid as $$
declare
  v_id uuid;
  v_taken integer;
  v_pool_taken integer;
begin
  select least(greatest(p_points, 0), points) into v_taken from family_members where id = p_member_id for update;
  select least(coalesce(v_taken, 0), family_points_pool) into v_pool_taken from families where id = p_family_id for update;

  insert into task_penalties (family_id, task_id, task_title, member_id, issued_by, points, pool_taken, reason)
  values (p_family_id, p_task_id, p_task_title, p_member_id, p_issued_by, coalesce(v_taken, 0), coalesce(v_pool_taken, 0), p_reason)
  returning id into v_id;

  update family_members set points = points - coalesce(v_taken, 0) where id = p_member_id;
  update families set family_points_pool = family_points_pool - coalesce(v_pool_taken, 0) where id = p_family_id;
  return v_id;
end;
$$ language plpgsql security definer;

-- "Не согласен": only an active fine can be appealed.
create or replace function appeal_penalty(p_id uuid, p_text text) returns text as $$
declare
  v_status text;
begin
  update task_penalties set status = 'appealed', appeal_text = nullif(trim(p_text), '')
  where id = p_id and status = 'active'
  returning status into v_status;
  return coalesce(v_status, (select status from task_penalties where id = p_id));
end;
$$ language plpgsql security definer;

-- Decision. p_cancel = true: the fine is lifted and the points come back
-- (works on an active fine too — the one who fined can forgive it).
-- p_cancel = false: an appealed fine stays in force.
create or replace function resolve_penalty(p_id uuid, p_resolver uuid, p_cancel boolean) returns text as $$
declare
  v_p task_penalties%rowtype;
begin
  select * into v_p from task_penalties where id = p_id for update;
  if not found then return null; end if;

  if p_cancel and v_p.status in ('active', 'appealed') then
    update task_penalties set status = 'cancelled', resolved_by = p_resolver, resolved_at = now() where id = p_id;
    update family_members set points = points + v_p.points where id = v_p.member_id;
    update families set family_points_pool = family_points_pool + v_p.pool_taken where id = v_p.family_id;
    return 'cancelled';
  elsif not p_cancel and v_p.status = 'appealed' then
    update task_penalties set status = 'upheld', resolved_by = p_resolver, resolved_at = now() where id = p_id;
    return 'upheld';
  end if;
  return v_p.status;
end;
$$ language plpgsql security definer;

grant execute on function issue_penalty(uuid, uuid, text, uuid, uuid, integer, text) to anon, authenticated;
grant execute on function appeal_penalty(uuid, text) to anon, authenticated;
grant execute on function resolve_penalty(uuid, uuid, boolean) to anon, authenticated;
