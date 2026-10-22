import { getSupabase } from "./supabaseClient";
import { occurrenceKey } from "./schedule";
import type {
  ActivityEvent,
  EarnedBadge,
  FamilyMember,
  Guide,
  Task,
} from "./types";

// Cross-device sync, opt-in via a "family code" (see docs/ARCHITECTURE.md
// "Storage & sync strategy"). Nobody signs in — the code is just the
// family's own row id in Supabase, shared like an unlisted link. Every
// push here is best-effort and swallows its own errors: sync is a bonus
// on top of the local-first store, never something the UI blocks on.

/** One person's own answer on a shared task (table task_member_marks). */
export interface MemberMark {
  status: "completed" | "refused" | "snoozed";
  at: string;
  reason?: string;
  snoozedUntil?: string;
}

export interface RemoteSnapshot {
  familyName: string;
  familyTimezone?: string;
  familyPoints: number;
  familyMilestonesUnlocked: number;
  members: FamilyMember[];
  tasks: Task[];
  occurrences: Record<
    string,
    {
      status: string;
      refusalReason?: string;
      completedAt?: string;
      snoozedUntil?: string;
      remindersSent: number;
      marks?: Record<string, MemberMark>;
    }
  >;
  activity: ActivityEvent[];
  earnedBadges: EarnedBadge[];
  familyRewardHistory: { tier: number; name: string; unlockedAt: string }[];
  guides: Guide[];
}

// Points, streaks and counts are owned by the database (the
// complete_task_occurrence RPC changes them atomically). A phone's copy
// can be stale — a reinstalled app, a phone that hasn't synced yet — so
// an ordinary upsert (rename, photo, joining) must never send them, or
// it would overwrite everyone's real score. Left out of the row, a new
// member gets the column defaults and an existing one keeps its values.
// Only enableSync, which seeds a brand-new cloud family from this phone,
// sends them.
function memberToRow(m: FamilyMember, familyId: string, withScores = false) {
  return {
    id: m.id,
    family_id: familyId,
    display_name: m.displayName,
    photo_url: m.photoUrl,
    accent_color: m.accentColor,
    ...(withScores
      ? {
          points: m.points,
          current_streak: m.currentStreak,
          longest_streak: m.longestStreak,
          completed_task_count: m.completedTaskCount,
          last_completion_date: m.lastCompletionDate,
        }
      : {}),
    active: m.active,
    updated_at: m.updatedAt,
  };
}

function rowToMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    displayName: row.display_name as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    accentColor: row.accent_color as FamilyMember["accentColor"],
    points: row.points as number,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    completedTaskCount: row.completed_task_count as number,
    lastCompletionDate: (row.last_completion_date as string | null) ?? null,
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    active: row.active as boolean,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? (row.created_at as string),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function taskToRow(t: Task, familyId: string) {
  return {
    id: t.id,
    family_id: familyId,
    title: t.title,
    description: t.description ?? null,
    category: t.category,
    icon: t.icon,
    color: t.color,
    points: t.points,
    difficulty: t.difficulty,
    assignee: t.assignee,
    creator_id: t.creatorId || null,
    recurrence: t.recurrence,
    start_time: t.startTime ?? null,
    due_time: t.dueTime ?? null,
    once_date: t.onceDate ?? null,
    has_deadline: t.hasDeadline,
    reminder_enabled: t.reminderEnabled,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt ?? null,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    category: row.category as string,
    icon: row.icon as Task["icon"],
    color: row.color as Task["color"],
    points: row.points as number,
    difficulty: row.difficulty as Task["difficulty"],
    assignee: row.assignee as Task["assignee"],
    creatorId: (row.creator_id as string | null) ?? "",
    recurrence: row.recurrence as Task["recurrence"],
    // Postgres `time` comes back as "12:00:00" — hours and minutes only.
    startTime: (row.start_time as string | null)?.slice(0, 5) ?? undefined,
    dueTime: (row.due_time as string | null)?.slice(0, 5) ?? undefined,
    onceDate: (row.once_date as string | null) ?? undefined,
    hasDeadline: row.has_deadline as boolean,
    reminderEnabled: row.reminder_enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function guideToRow(g: Guide, familyId: string) {
  return {
    id: g.id,
    family_id: familyId,
    title: g.title,
    content: g.content,
    updated_at: g.updatedAt,
    deleted_at: g.deletedAt ?? null,
  };
}

function rowToGuide(row: Record<string, unknown>): Guide {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    title: row.title as string,
    content: row.content as string,
    updatedAt: (row.updated_at as string | null) ?? (row.created_at as string),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

/** Uploads to the public "photos" bucket and returns its public URL, or null on failure. */
export async function uploadPhoto(file: File, memberId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const path = `${memberId}-${Date.now()}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (error) return null;
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export type SyncResult = { ok: true } | { ok: false; error: string };

type SupabaseLike = NonNullable<ReturnType<typeof getSupabase>>;

// Supabase/PostgREST reports a column this payload set but the live
// table doesn't have yet (because a migration hasn't been run) with a
// message like "Could not find the 'deleted_at' column of
// 'family_members' in the schema cache". Rather than make every push
// hard-fail until someone can get to the SQL Editor — which, for
// someone on just a phone, might be a while — strip that one field out
// and retry, so sync still works with whatever columns actually exist.
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column/;

async function upsertTolerant(
  supabase: SupabaseLike,
  table: string,
  row: Record<string, unknown>,
): Promise<SyncResult> {
  const payload = { ...row };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from(table).upsert(payload);
    if (!error) return { ok: true };
    const match = error.message.match(MISSING_COLUMN_RE);
    if (match && match[1] && match[1] in payload) {
      delete payload[match[1]];
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "В облаке не хватает нескольких столбцов — нужна миграция схемы." };
}

/** Same column-stripping tolerance as upsertTolerant, for a targeted update. Returns ok:false (not an error) if every field in `row` turned out to be an unknown column — nothing was left to write. */
async function updateTolerant(
  supabase: SupabaseLike,
  table: string,
  id: string,
  row: Record<string, unknown>,
): Promise<SyncResult> {
  const payload = { ...row };
  for (let attempt = 0; attempt < 5; attempt++) {
    if (Object.keys(payload).length === 0) {
      return { ok: false, error: "В облаке не хватает нужных столбцов для этого изменения." };
    }
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (!error) return { ok: true };
    const match = error.message.match(MISSING_COLUMN_RE);
    if (match && match[1] && match[1] in payload) {
      delete payload[match[1]];
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "В облаке не хватает нескольких столбцов — нужна миграция схемы." };
}

export async function createRemoteFamily(id: string, name: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.from("families").insert({ id, name });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Deletes every family (and, via `on delete cascade`, every member, task,
 * occurrence, badge, activity row, push subscription — everything) from
 * this device's connected cloud project. A panic button for "sync got
 * tangled into multiple accidental families" — lets someone undo that
 * mess from their phone, with no SQL Editor or computer needed.
 */
export async function wipeAllCloudFamilies(): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.from("families").delete().not("id", "is", null);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushMember(
  member: FamilyMember,
  familyId: string,
  opts: { withScores?: boolean } = {},
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    return await upsertTolerant(supabase, "family_members", memberToRow(member, familyId, opts.withScores));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushTask(task: Task, familyId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    return await upsertTolerant(supabase, "tasks", taskToRow(task, familyId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Soft-delete (set deleted_at) rather than a hard `delete` — a hard
// delete just vanishes from other devices' next fetch, which looks
// identical to "not pushed there yet," so mergeSnapshot would never
// know to remove its own cached copy and the item would silently
// reappear. A tombstone lets every device see the delete and act on it.
export async function deleteRemoteTask(taskId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  const now = new Date().toISOString();
  try {
    const softDelete = await updateTolerant(supabase, "tasks", taskId, { deleted_at: now, updated_at: now });
    if (softDelete.ok) return softDelete;
    // Couldn't write a tombstone at all (deleted_at doesn't exist in
    // this database yet) — a hard delete at least does something now,
    // even though a device that already cached this row won't learn it
    // was removed until the column exists for real.
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteRemoteMember(memberId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  const now = new Date().toISOString();
  try {
    const softDelete = await updateTolerant(supabase, "family_members", memberId, {
      deleted_at: now,
      updated_at: now,
    });
    if (softDelete.ok) return softDelete;
    const { error } = await supabase.from("family_members").delete().eq("id", memberId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushComplete(
  taskId: string,
  dateISO: string,
  familyId: string,
  points: number,
  memberIds: string[],
): Promise<
  | { ok: true; data: { alreadyCompleted: boolean; badges: unknown[]; rewards: unknown[] } }
  | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { data, error } = await supabase.rpc("complete_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_family_id: familyId,
      p_points: points,
      p_member_ids: memberIds,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as { alreadyCompleted: boolean; badges: unknown[]; rewards: unknown[] } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** "Сделано" for one person on a shared task — points only to them. */
export async function pushCompleteForMember(
  taskId: string,
  dateISO: string,
  familyId: string,
  points: number,
  memberId: string,
  allMemberIds: string[],
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.rpc("complete_task_for_member", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_family_id: familyId,
      p_points: points,
      p_member_id: memberId,
      p_all_member_ids: allMemberIds,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** "Не буду" / "Напомни позже" for one person on a shared task. */
export async function pushMarkForMember(
  taskId: string,
  dateISO: string,
  memberId: string,
  status: "refused" | "snoozed",
  opts: { reason?: string; hours?: number },
  allMemberIds: string[],
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.rpc("mark_task_for_member", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_member_id: memberId,
      p_status: status,
      p_reason: opts.reason ?? null,
      p_hours: opts.hours ?? null,
      p_all_member_ids: allMemberIds,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushRefuse(taskId: string, dateISO: string, reason: string | undefined): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.rpc("refuse_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_reason: reason ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushSnooze(taskId: string, dateISO: string, hours: number): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.rpc("snooze_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_hours: hours,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function savePushSubscription(memberId: string, sub: PushSubscriptionJSON) {
  const supabase = getSupabase();
  if (!supabase || !sub.endpoint || !sub.keys) return false;
  try {
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        member_id: memberId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" },
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fans out a push notification to everyone in the family except
 * `excludeMemberIds` (normally whoever just took the action — they don't
 * need to be told about their own completion). Calls the "send-push"
 * Edge Function — see supabase/functions/send-push for its code and
 * docs/ARCHITECTURE.md "Notifications" for the deploy step this needs.
 * Silently does nothing if that function isn't deployed yet.
 */
export async function notifyFamily(
  familyId: string,
  excludeMemberIds: string[],
  title: string,
  body: string,
  url?: string,
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.functions.invoke("send-push", {
      body: { familyId, excludeMemberIds, title, body, url },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushGuide(guide: Guide, familyId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    return await upsertTolerant(supabase, "family_guides", guideToRow(guide, familyId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteRemoteGuide(guideId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  const now = new Date().toISOString();
  try {
    const softDelete = await updateTolerant(supabase, "family_guides", guideId, {
      deleted_at: now,
      updated_at: now,
    });
    if (softDelete.ok) return softDelete;
    const { error } = await supabase.from("family_guides").delete().eq("id", guideId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushActivity(event: ActivityEvent, familyId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.from("family_activity").insert({
      family_id: familyId,
      type: event.type,
      member_id: event.memberId || null,
      task_id: event.taskId ?? null,
      points: event.points ?? null,
      message: event.message,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Re-marks an occurrence completed on the server without awarding
 * anything — used to repair rows an old reminder sweep reset to
 * "pending" after they'd been done (the points were awarded back then).
 */
export async function repairCompletedOccurrence(taskId: string, dateISO: string, completedAt: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase
      .from("task_occurrences")
      .update({ status: "completed", completed_at: completedAt })
      .eq("task_id", taskId)
      .eq("scheduled_for", dateISO)
      .neq("status", "completed");
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The reminder sweep decides what "today" is (and when a task is due)
 * in the family's timezone, which defaulted to Moscow. Phones record
 * completions under their own local date, so a family living elsewhere
 * had "done" recorded on one day and the sweep checking another — and
 * the alarm kept going. Phones keep it set to where the family is.
 */
export async function syncFamilyTimezone(familyId: string, timezone: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.from("families").update({ timezone }).eq("id", familyId);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchSnapshot(
  familyId: string,
): Promise<{ ok: true; snapshot: RemoteSnapshot } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  let familyRes, membersRes, tasksRes, occRes, activityRes, badgesRes, historyRes, guidesRes, marksRes;
  try {
    [familyRes, membersRes, tasksRes, occRes, activityRes, badgesRes, historyRes, guidesRes, marksRes] = await Promise.all([
      supabase.from("families").select("*").eq("id", familyId).maybeSingle(),
      supabase.from("family_members").select("*").eq("family_id", familyId),
      supabase.from("tasks").select("*").eq("family_id", familyId),
      // Recent weeks only, newest first. Unbounded, this hit the API's
      // 1000-row cap once the history grew, and whichever rows got cut —
      // often today's "completed" ones — made done tasks look undone
      // again (and re-ticking them earned nothing: the server already
      // had them completed, so the points snapped back).
      supabase
        .from("task_occurrences")
        .select("*, tasks!inner(family_id)")
        .eq("tasks.family_id", familyId)
        .gte("scheduled_for", isoDaysAgo(21))
        .order("scheduled_for", { ascending: false })
        .limit(1000),
      supabase.from("family_activity").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(200),
      supabase.from("user_badges").select("*, family_members!inner(family_id)").eq("family_members.family_id", familyId),
      supabase.from("family_reward_history").select("*").eq("family_id", familyId).order("tier", { ascending: false }),
      // Tolerated like everything below familyRes — if `family_guides`
      // doesn't exist yet on an older project, this just comes back with
      // an error and `guidesRes.data` stays undefined, so guides fall
      // back to an empty list instead of failing the whole sync pull.
      supabase.from("family_guides").select("*").eq("family_id", familyId),
      // Per-person answers on shared tasks. Tolerated like guides: before
      // the shared-tasks migration this table doesn't exist.
      supabase
        .from("task_member_marks")
        .select("*, tasks!inner(family_id)")
        .eq("tasks.family_id", familyId)
        .gte("scheduled_for", isoDaysAgo(21))
        .limit(1000),
    ]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (familyRes.error) return { ok: false, error: familyRes.error.message };
  if (!familyRes.data) return { ok: false, error: "Код не найден — проверьте, что скопировали его точно." };

  const occurrences: RemoteSnapshot["occurrences"] = {};
  for (const row of occRes.data ?? []) {
    occurrences[occurrenceKey(row.task_id, row.scheduled_for)] = {
      status: row.status,
      refusalReason: row.refusal_reason ?? undefined,
      completedAt: row.completed_at ?? undefined,
      snoozedUntil: row.snoozed_until ?? undefined,
      remindersSent: row.reminders_sent ?? 0,
    };
  }
  for (const row of marksRes.error ? [] : (marksRes.data ?? [])) {
    const key = occurrenceKey(row.task_id, row.scheduled_for);
    const occ = (occurrences[key] ??= { status: "pending", remindersSent: 0 });
    occ.marks = {
      ...occ.marks,
      [row.member_id]: {
        status: row.status,
        at: row.at,
        reason: row.refusal_reason ?? undefined,
        snoozedUntil: row.snoozed_until ?? undefined,
      },
    };
  }

  return {
    ok: true,
    snapshot: {
      familyName: familyRes.data.name,
      familyTimezone: familyRes.data.timezone ?? undefined,
      familyPoints: familyRes.data.family_points_pool,
      familyMilestonesUnlocked: familyRes.data.family_milestones_unlocked,
      members: (membersRes.data ?? []).map(rowToMember),
      tasks: (tasksRes.data ?? []).map(rowToTask),
      occurrences,
      activity: (activityRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        type: row.type,
        memberId: row.member_id ?? "",
        taskId: row.task_id ?? undefined,
        points: row.points ?? undefined,
        message: row.message,
        createdAt: row.created_at,
      })),
      earnedBadges: (badgesRes.data ?? []).map((row) => ({
        memberId: row.member_id,
        badgeId: row.badge_id,
        earnedAt: row.earned_at,
      })),
      familyRewardHistory: (historyRes.data ?? []).map((row) => ({
        tier: row.tier,
        name: row.name,
        unlockedAt: row.unlocked_at,
      })),
      guides: (guidesRes.data ?? []).map(rowToGuide),
    },
  };
}

/**
 * Lightweight lookup before committing to a join — lets the UI show
 * "you're about to join: Маша, Ваня, Наташа (3 people)" so joining the
 * wrong code (a typo, or someone else's accidentally-created family)
 * is obvious before it happens instead of after.
 */
export async function previewFamily(
  familyId: string,
): Promise<{ ok: true; memberNames: string[] } | { ok: false; error: string }> {
  const result = await fetchSnapshot(familyId);
  if (!result.ok) return result;
  // Removed members stay in the table as tombstones (deleted_at) — they
  // must not show up in "в этой семье: …" when someone joins by code.
  return { ok: true, memberNames: result.snapshot.members.filter((m) => !m.deletedAt).map((m) => m.displayName) };
}
