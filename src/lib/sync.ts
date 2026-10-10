import { getSupabase } from "./supabaseClient";
import { occurrenceKey } from "./schedule";
import type {
  ActivityEvent,
  EarnedBadge,
  FamilyMember,
  Task,
} from "./types";

// Cross-device sync, opt-in via a "family code" (see docs/ARCHITECTURE.md
// "Storage & sync strategy"). Nobody signs in — the code is just the
// family's own row id in Supabase, shared like an unlisted link. Every
// push here is best-effort and swallows its own errors: sync is a bonus
// on top of the local-first store, never something the UI blocks on.

export interface RemoteSnapshot {
  familyName: string;
  familyPoints: number;
  familyMilestonesUnlocked: number;
  members: FamilyMember[];
  tasks: Task[];
  occurrences: Record<string, { status: string; refusalReason?: string; completedAt?: string; snoozedUntil?: string; remindersSent: number }>;
  activity: ActivityEvent[];
  earnedBadges: EarnedBadge[];
  familyRewardHistory: { tier: number; name: string; unlockedAt: string }[];
}

function memberToRow(m: FamilyMember, familyId: string) {
  return {
    id: m.id,
    family_id: familyId,
    display_name: m.displayName,
    photo_url: m.photoUrl,
    accent_color: m.accentColor,
    points: m.points,
    current_streak: m.currentStreak,
    longest_streak: m.longestStreak,
    completed_task_count: m.completedTaskCount,
    last_completion_date: m.lastCompletionDate,
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
    startTime: (row.start_time as string | null) ?? undefined,
    dueTime: (row.due_time as string | null) ?? undefined,
    onceDate: (row.once_date as string | null) ?? undefined,
    hasDeadline: row.has_deadline as boolean,
    reminderEnabled: row.reminder_enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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

export async function pushMember(member: FamilyMember, familyId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    // upsert() resolves with { error } rather than throwing on a DB-level
    // failure (e.g. a column this payload sets doesn't exist yet) — a
    // bare try/catch around it never saw those, so a broken push looked
    // identical to a successful one from here.
    const { error } = await supabase.from("family_members").upsert(memberToRow(member, familyId));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pushTask(task: Task, familyId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.from("tasks").upsert(taskToRow(task, familyId));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
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
    const { error } = await supabase.from("tasks").update({ deleted_at: now, updated_at: now }).eq("id", taskId);
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
    const { error } = await supabase
      .from("family_members")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", memberId);
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
) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("complete_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_family_id: familyId,
      p_points: points,
      p_member_ids: memberIds,
    });
    if (error) return null;
    return data as { alreadyCompleted: boolean; badges: unknown[]; rewards: unknown[] };
  } catch {
    return null;
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
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  try {
    const { error } = await supabase.functions.invoke("send-push", {
      body: { familyId, excludeMemberIds, title, body },
    });
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

export async function fetchSnapshot(
  familyId: string,
): Promise<{ ok: true; snapshot: RemoteSnapshot } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Облако не настроено на этом устройстве." };
  let familyRes, membersRes, tasksRes, occRes, activityRes, badgesRes, historyRes;
  try {
    [familyRes, membersRes, tasksRes, occRes, activityRes, badgesRes, historyRes] = await Promise.all([
      supabase.from("families").select("*").eq("id", familyId).maybeSingle(),
      supabase.from("family_members").select("*").eq("family_id", familyId),
      supabase.from("tasks").select("*").eq("family_id", familyId),
      supabase
        .from("task_occurrences")
        .select("*, tasks!inner(family_id)")
        .eq("tasks.family_id", familyId),
      supabase.from("family_activity").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(200),
      supabase.from("user_badges").select("*, family_members!inner(family_id)").eq("family_members.family_id", familyId),
      supabase.from("family_reward_history").select("*").eq("family_id", familyId).order("tier", { ascending: false }),
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

  return {
    ok: true,
    snapshot: {
      familyName: familyRes.data.name,
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
  return { ok: true, memberNames: result.snapshot.members.map((m) => m.displayName) };
}
