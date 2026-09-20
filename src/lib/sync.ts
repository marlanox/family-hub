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
    active: m.active,
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
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    active: row.active as boolean,
    createdAt: row.created_at as string,
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

export async function createRemoteFamily(id: string, name: string) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("families").insert({ id, name });
    return !error;
  } catch {
    return false;
  }
}

export async function pushMember(member: FamilyMember, familyId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("family_members").upsert(memberToRow(member, familyId));
  } catch {
    // best-effort
  }
}

export async function pushTask(task: Task, familyId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("tasks").upsert(taskToRow(task, familyId));
  } catch {
    // best-effort
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

export async function pushRefuse(taskId: string, dateISO: string, reason: string | undefined) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.rpc("refuse_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_reason: reason ?? null,
    });
  } catch {
    // best-effort
  }
}

export async function pushSnooze(taskId: string, dateISO: string, hours: number) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.rpc("snooze_task_occurrence", {
      p_task_id: taskId,
      p_scheduled_for: dateISO,
      p_hours: hours,
    });
  } catch {
    // best-effort
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
) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.functions.invoke("send-push", {
      body: { familyId, excludeMemberIds, title, body },
    });
  } catch {
    // Function not deployed, or offline — notifications are a bonus.
  }
}

export async function pushActivity(event: ActivityEvent, familyId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("family_activity").insert({
      family_id: familyId,
      type: event.type,
      member_id: event.memberId || null,
      task_id: event.taskId ?? null,
      points: event.points ?? null,
      message: event.message,
    });
  } catch {
    // best-effort
  }
}

export async function fetchSnapshot(familyId: string): Promise<RemoteSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
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
  } catch {
    return null;
  }

  if (!familyRes.data) return null;

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
  };
}
