"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isScheduledOn, occurrenceKey, resolveAssigneeIds, todayISO } from "./schedule";
import { playSound, type SoundTheme } from "./sound";
import {
  createRemoteFamily,
  deleteRemoteGuide,
  deleteRemoteMember,
  deleteRemoteTask,
  fetchSnapshot,
  notifyFamily,
  pushActivity,
  pushComplete,
  pushGuide,
  pushMember,
  pushRefuse,
  pushSnooze,
  pushTask,
  wipeAllCloudFamilies,
  type RemoteSnapshot,
} from "./sync";
import { setCustomSupabase } from "./supabaseClient";
import type {
  ActivityEvent,
  Difficulty,
  EarnedBadge,
  FamilyMember,
  Guide,
  IconKey,
  OccurrenceStatus,
  Recurrence,
  Task,
  TaskAssignee,
} from "./types";

const FAMILY_ID = "local-family";
const FAMILY_GOAL = 5000;
// The family goal keeps paying out a different kind of reward each time
// it's hit — see docs/ARCHITECTURE.md "Points & rewards".
const FAMILY_REWARD_ROTATION = ["Кино 🎬", "Ресторан 🍽️", "Крутая покупка 🛍️"];

function nextFamilyRewardName(tier: number) {
  return FAMILY_REWARD_ROTATION[tier % FAMILY_REWARD_ROTATION.length]!;
}

// Real UUIDs only — these ids get written straight into Postgres `uuid`
// columns when sync is on, and a prefixed string like "member-<uuid>"
// is rejected by Postgres at the type level (silently, from the app's
// point of view, since every push swallows its own errors). The
// `prefix` param is kept for callsite readability but no longer used.
function newId(_prefix?: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Extremely unlikely fallback (pre-2022 browser): not a real UUID, so
  // sync will reject it — local-only mode still works fine with it.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

interface OccurrenceRecord {
  status: OccurrenceStatus;
  refusalReason?: string;
  completedAt?: string;
  snoozedUntil?: string;
  remindersSent: number;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  category: string;
  icon: IconKey;
  color: FamilyMember["accentColor"];
  points: number;
  difficulty: Difficulty;
  assignee: TaskAssignee;
  creatorId: string;
  recurrence: Recurrence;
  startTime?: string;
  dueTime?: string;
  onceDate?: string;
  hasDeadline: boolean;
  reminderEnabled: boolean;
}

interface Celebration {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  kind: "badge" | "reward";
}

interface FamilyRewardHistoryEntry {
  tier: number;
  name: string;
  unlockedAt: string;
}

const ACCENT_CYCLE: FamilyMember["accentColor"][] = ["pink", "sky", "lilac", "mint", "yellow", "coral"];

interface FamilyHubState {
  members: FamilyMember[];
  tasks: Task[];
  occurrences: Record<string, OccurrenceRecord>;
  activity: ActivityEvent[];
  earnedBadges: EarnedBadge[];
  guides: Guide[];
  familyPoints: number;
  familyMilestonesUnlocked: number;
  familyRewardHistory: FamilyRewardHistoryEntry[];
  soundEnabled: boolean;
  soundTheme: SoundTheme;
  whoAmI: string | null;
  onboardingComplete: boolean;
  // Whether this device has already been asked (once) to enable push
  // notifications — set regardless of whether they said yes, so the
  // prompt doesn't nag on every launch. People routinely never found
  // the toggle buried in Settings, so onboarding now asks directly.
  pushPromptSeen: boolean;
  hasHydrated: boolean;
  lastCelebration: Celebration | null;
  familyCode: string | null;
  lastSyncedAt: string | null;
  syncing: boolean;
  lastSyncError: string | null;
  customSupabaseUrl: string | null;
  customSupabaseKey: string | null;
  // Member/task ids this device has actually seen on the server as of
  // its last successful sync — lets a merge tell "the server deleted
  // this" apart from "this hasn't been pushed yet" even when the
  // deletion was a hard delete with no tombstone to read back.
  knownRemoteMemberIds: string[];
  knownRemoteTaskIds: string[];

  occurrenceFor: (taskId: string, dateISO?: string) => OccurrenceRecord;
  todaysTasks: (dateISO?: string) => Task[];
  currentFamilyRewardName: () => string;

  completeTask: (taskId: string, dateISO?: string) => void;
  refuseTask: (taskId: string, reason: string | undefined, dateISO?: string) => void;
  snoozeTask: (taskId: string, hours: number, dateISO?: string) => void;
  addTask: (input: NewTaskInput) => string;
  removeTask: (taskId: string) => void;
  addGuide: (title: string, content: string) => string;
  updateGuide: (id: string, fields: { title?: string; content?: string }) => void;
  removeGuide: (id: string) => void;
  addMember: (name: string, accentColor?: FamilyMember["accentColor"]) => string;
  removeMember: (id: string) => void;
  updateMemberPhoto: (id: string, photoUrl: string | null) => void;
  renameMember: (id: string, name: string) => void;
  setWhoAmI: (id: string | null) => void;
  finishOnboarding: () => void;
  markPushPromptSeen: () => void;
  resetAll: () => void;
  enableSync: () => Promise<string | null>;
  joinSync: (code: string) => Promise<boolean>;
  pullSync: () => Promise<void>;
  clearSyncError: () => void;
  leaveSync: () => void;
  wipeCloudFamily: () => Promise<boolean>;
  setCustomSupabaseConfig: (url: string | null, key: string | null) => void;
  toggleSound: () => void;
  setSoundTheme: (theme: SoundTheme) => void;
  dismissCelebration: () => void;
  logActivity: (event: Omit<ActivityEvent, "id" | "familyId" | "createdAt">) => void;
}

// Who should actually act on one specific occurrence — a "rotation"
// assignee resolves to whoever's week it is, not the whole pool.
function assigneeMembers(assignee: TaskAssignee, members: FamilyMember[], dateISO: string): FamilyMember[] {
  const ids = resolveAssigneeIds(assignee, dateISO);
  if (ids === "family") return members;
  return members.filter((m) => ids.includes(m.id));
}

// The full named pool this task concerns, ignoring whose turn it is —
// used for display/labels that talk about the task in general (e.g. the
// "new task assigned" message), not about one day's occurrence.
function assigneePoolMembers(assignee: TaskAssignee, members: FamilyMember[]): FamilyMember[] {
  if (assignee.kind === "family") return members;
  return members.filter((m) => assignee.memberIds.includes(m.id));
}

function freshMember(name: string, accentColor: FamilyMember["accentColor"]): FamilyMember {
  return {
    id: newId("member"),
    familyId: FAMILY_ID,
    displayName: name,
    photoUrl: null,
    accentColor,
    points: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedTaskCount: 0,
    lastCompletionDate: null,
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Merging remote snapshots into local state — never a blind overwrite.
// Sync is polled every ~20s (see RemoteSync.tsx) and also runs right
// after joining a code; a plain overwrite meant any gap between "local
// mutation happened" and "it finished pushing" could get clobbered by a
// still-stale remote snapshot, which is what caused real reported data
// loss (points and whole tasks disappearing after a "sync").
const STATUS_RANK: Record<string, number> = { pending: 0, snoozed: 1, refused: 2, completed: 3 };

function mergeOccurrence(a: OccurrenceRecord | undefined, b: OccurrenceRecord | undefined): OccurrenceRecord {
  if (!a) return b!;
  if (!b) return a;
  const winner = (STATUS_RANK[b.status] ?? 0) > (STATUS_RANK[a.status] ?? 0) ? b : a;
  return { ...winner, remindersSent: Math.max(a.remindersSent ?? 0, b.remindersSent ?? 0) };
}

function mergeOccurrences(
  local: Record<string, OccurrenceRecord>,
  remote: Record<string, OccurrenceRecord>,
): Record<string, OccurrenceRecord> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: Record<string, OccurrenceRecord> = {};
  for (const k of keys) merged[k] = mergeOccurrence(local[k], remote[k]);
  return merged;
}

function mergeMembers(local: FamilyMember[], remote: FamilyMember[], knownRemoteIds: Set<string>): FamilyMember[] {
  const remoteIds = new Set(remote.map((r) => r.id));
  const byId = new Map<string, FamilyMember>();
  for (const m of local) {
    // This device previously confirmed this member existed on the
    // server, but the server has no record of them at all now — a hard
    // delete (e.g. one that happened before the deleted_at column
    // existed), not a missing-not-yet-pushed member. Drop it locally
    // too, instead of treating the gap as "not synced yet" and pushing
    // it right back up the next time this device syncs.
    if (knownRemoteIds.has(m.id) && !remoteIds.has(m.id)) continue;
    byId.set(m.id, m);
  }
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      continue;
    }
    // Display fields (name/photo/color/active) come from whichever side
    // edited them most recently — "local always wins" would mean a photo
    // set on one phone never reaches another phone that already cached
    // any older photo for that person.
    const fresh = (r.updatedAt || "") > (l.updatedAt || "") ? r : l;
    byId.set(r.id, {
      ...fresh,
      points: Math.max(l.points, r.points),
      longestStreak: Math.max(l.longestStreak, r.longestStreak),
      completedTaskCount: Math.max(l.completedTaskCount, r.completedTaskCount),
      // Whichever side completed something more recently owns the streak
      // (it has the freshest lastCompletionDate); a stale side's number
      // never gets to overwrite a fresher one.
      ...((r.lastCompletionDate ?? "") > (l.lastCompletionDate ?? "")
        ? { currentStreak: r.currentStreak, lastCompletionDate: r.lastCompletionDate }
        : { currentStreak: l.currentStreak, lastCompletionDate: l.lastCompletionDate }),
    });
  }
  // A tombstoned row (removed on some device while synced) drops out of
  // every device's merged state instead of resurfacing — see
  // deleteRemoteMember's comment for why a hard delete can't do this.
  return Array.from(byId.values()).filter((m) => !m.deletedAt);
}

function mergeTasks(local: Task[], remote: Task[], knownRemoteIds: Set<string>): Task[] {
  const remoteIds = new Set(remote.map((r) => r.id));
  const byId = new Map<string, Task>();
  for (const t of local) {
    if (knownRemoteIds.has(t.id) && !remoteIds.has(t.id)) continue;
    byId.set(t.id, t);
  }
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      continue;
    }
    const lTime = new Date(l.updatedAt || l.createdAt || 0).getTime();
    const rTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
    byId.set(r.id, rTime > lTime ? r : l);
  }
  return Array.from(byId.values()).filter((t) => !t.deletedAt);
}

function activityDedupeKey(e: ActivityEvent) {
  return `${e.type}|${e.memberId}|${e.taskId ?? ""}|${e.message}`;
}

function mergeActivity(local: ActivityEvent[], remote: ActivityEvent[]): ActivityEvent[] {
  const seen = new Map<string, ActivityEvent>();
  for (const e of [...local, ...remote]) {
    const k = activityDedupeKey(e);
    const existing = seen.get(k);
    if (!existing || new Date(e.createdAt).getTime() < new Date(existing.createdAt).getTime()) {
      seen.set(k, existing ? { ...e, id: existing.id } : e);
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 200);
}

function mergeBadges(local: EarnedBadge[], remote: EarnedBadge[]): EarnedBadge[] {
  const byKey = new Map<string, EarnedBadge>();
  for (const b of [...local, ...remote]) {
    const k = `${b.memberId}__${b.badgeId}`;
    const existing = byKey.get(k);
    if (!existing || new Date(b.earnedAt).getTime() < new Date(existing.earnedAt).getTime()) {
      byKey.set(k, b);
    }
  }
  return Array.from(byKey.values());
}

function mergeGuides(local: Guide[], remote: Guide[]): Guide[] {
  const byId = new Map<string, Guide>();
  for (const g of local) byId.set(g.id, g);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      continue;
    }
    const lTime = new Date(l.updatedAt || 0).getTime();
    const rTime = new Date(r.updatedAt || 0).getTime();
    byId.set(r.id, rTime > lTime ? r : l);
  }
  return Array.from(byId.values()).filter((g) => !g.deletedAt);
}

function mergeRewardHistory(
  local: FamilyRewardHistoryEntry[],
  remote: FamilyRewardHistoryEntry[],
): FamilyRewardHistoryEntry[] {
  const byTier = new Map<number, FamilyRewardHistoryEntry>();
  for (const r of [...local, ...remote]) byTier.set(r.tier, r);
  return Array.from(byTier.values()).sort((a, b) => b.tier - a.tier);
}

interface MergeResult {
  members: FamilyMember[];
  tasks: Task[];
  occurrences: Record<string, OccurrenceRecord>;
  activity: ActivityEvent[];
  earnedBadges: EarnedBadge[];
  guides: Guide[];
  familyPoints: number;
  familyMilestonesUnlocked: number;
  familyRewardHistory: FamilyRewardHistoryEntry[];
  knownRemoteMemberIds: string[];
  knownRemoteTaskIds: string[];
}

function mergeSnapshot(
  local: {
    members: FamilyMember[];
    tasks: Task[];
    occurrences: Record<string, OccurrenceRecord>;
    activity: ActivityEvent[];
    earnedBadges: EarnedBadge[];
    guides: Guide[];
    familyPoints: number;
    familyMilestonesUnlocked: number;
    familyRewardHistory: FamilyRewardHistoryEntry[];
    knownRemoteMemberIds: string[];
    knownRemoteTaskIds: string[];
  },
  remote: RemoteSnapshot,
): MergeResult {
  const familyPool =
    remote.familyMilestonesUnlocked > local.familyMilestonesUnlocked
      ? { familyMilestonesUnlocked: remote.familyMilestonesUnlocked, familyPoints: remote.familyPoints }
      : remote.familyMilestonesUnlocked < local.familyMilestonesUnlocked
        ? { familyMilestonesUnlocked: local.familyMilestonesUnlocked, familyPoints: local.familyPoints }
        : {
            familyMilestonesUnlocked: local.familyMilestonesUnlocked,
            familyPoints: Math.max(local.familyPoints, remote.familyPoints),
          };

  return {
    members: mergeMembers(local.members, remote.members, new Set(local.knownRemoteMemberIds)),
    tasks: mergeTasks(local.tasks, remote.tasks, new Set(local.knownRemoteTaskIds)),
    occurrences: mergeOccurrences(local.occurrences, remote.occurrences as Record<string, OccurrenceRecord>),
    activity: mergeActivity(local.activity, remote.activity),
    earnedBadges: mergeBadges(local.earnedBadges, remote.earnedBadges),
    guides: mergeGuides(local.guides, remote.guides),
    familyRewardHistory: mergeRewardHistory(local.familyRewardHistory, remote.familyRewardHistory),
    // What the server actually has right now — compared against next
    // time, to tell "deleted on the server" apart from "not pushed yet".
    knownRemoteMemberIds: remote.members.map((m) => m.id),
    knownRemoteTaskIds: remote.tasks.map((t) => t.id),
    ...familyPool,
  };
}

const EMPTY_STATE = {
  members: [] as FamilyMember[],
  tasks: [] as Task[],
  occurrences: {} as Record<string, OccurrenceRecord>,
  activity: [] as ActivityEvent[],
  earnedBadges: [] as EarnedBadge[],
  guides: [] as Guide[],
  familyPoints: 0,
  familyMilestonesUnlocked: 0,
  familyRewardHistory: [] as FamilyRewardHistoryEntry[],
  whoAmI: null as string | null,
  onboardingComplete: false,
  pushPromptSeen: false,
  familyCode: null as string | null,
  lastSyncedAt: null as string | null,
  knownRemoteMemberIds: [] as string[],
  knownRemoteTaskIds: [] as string[],
};

export const useFamilyStore = create<FamilyHubState>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,
      soundEnabled: true,
      soundTheme: "xylophone",
      hasHydrated: false,
      lastCelebration: null,
      syncing: false,
      lastSyncError: null,
      // Not part of EMPTY_STATE: which cloud project this *device* talks
      // to is a device setting, not family data — "Сбросить все данные"
      // shouldn't disconnect a friend's own Supabase project.
      customSupabaseUrl: null,
      customSupabaseKey: null,

      occurrenceFor: (taskId, dateISO = todayISO()) => {
        const key = occurrenceKey(taskId, dateISO);
        return get().occurrences[key] ?? { status: "pending", remindersSent: 0 };
      },

      todaysTasks: (dateISO = todayISO()) => {
        const date = new Date(`${dateISO}T12:00:00`);
        return get().tasks.filter((t) => isScheduledOn(t, date));
      },

      currentFamilyRewardName: () => nextFamilyRewardName(get().familyMilestonesUnlocked),

      logActivity: (event) => {
        set((state) => ({
          activity: [
            {
              ...event,
              id: newId("activity"),
              familyId: FAMILY_ID,
              createdAt: new Date().toISOString(),
            },
            ...state.activity,
          ].slice(0, 200),
        }));
      },

      completeTask: (taskId, dateISO = todayISO()) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const key = occurrenceKey(taskId, dateISO);
        if (state.occurrences[key]?.status === "completed") return;

        const members = assigneeMembers(task.assignee, state.members, dateISO);
        const now = new Date().toISOString();
        const hourNow = new Date().getHours();
        const celebrations: Celebration[] = [];
        const newlyEarned: EarnedBadge[] = [];

        const updatedMembers = state.members.map((m) => {
          if (!members.some((am) => am.id === m.id)) return m;
          // Streak counts consecutive CALENDAR DAYS with at least one
          // completion, not completions themselves — ten tasks done today
          // must stay "1 day," not become "10 days in a row."
          const yesterday = todayISO(new Date(new Date(dateISO).getTime() - 86400000));
          const nextStreak =
            m.lastCompletionDate === dateISO
              ? m.currentStreak
              : m.lastCompletionDate === yesterday
                ? m.currentStreak + 1
                : 1;
          const newPoints = m.points + task.points;
          const prevTier = Math.floor(m.points / 1000);
          const newTier = Math.floor(newPoints / 1000);

          for (let tier = prevTier + 1; tier <= newTier; tier++) {
            newlyEarned.push({ memberId: m.id, badgeId: `points-${tier}`, earnedAt: now });
            celebrations.push({
              key: newId("cel"),
              emoji: "🏆",
              title: `${m.displayName} заработал(а) кубок за ${tier * 1000} баллов!`,
              subtitle: "Новый личный рубеж — так держать",
              kind: "badge",
            });
          }
          const streakAdvancedToday = m.lastCompletionDate !== dateISO;
          if (streakAdvancedToday && (nextStreak === 7 || nextStreak === 30)) {
            newlyEarned.push({ memberId: m.id, badgeId: `streak-${nextStreak}`, earnedAt: now });
            celebrations.push({
              key: newId("cel"),
              emoji: "🔥",
              title: `${m.displayName}: ${nextStreak} дней подряд!`,
              subtitle: "Значок получен",
              kind: "badge",
            });
          }
          if (hourNow < 8) {
            const already = state.earnedBadges.some(
              (b) => b.memberId === m.id && b.badgeId === "early-bird",
            );
            if (!already) {
              newlyEarned.push({ memberId: m.id, badgeId: "early-bird", earnedAt: now });
              celebrations.push({
                key: newId("cel"),
                emoji: "🌅",
                title: `${m.displayName} получил(а) значок «Ранняя пташка»`,
                subtitle: "Дело сделано с утра",
                kind: "badge",
              });
            }
          }

          return {
            ...m,
            points: newPoints,
            currentStreak: nextStreak,
            longestStreak: Math.max(m.longestStreak, nextStreak),
            completedTaskCount: m.completedTaskCount + 1,
            lastCompletionDate: dateISO,
          };
        });

        let familyPoints = state.familyPoints + task.points;
        let familyMilestonesUnlocked = state.familyMilestonesUnlocked;
        const familyRewardHistory = [...state.familyRewardHistory];
        while (familyPoints >= FAMILY_GOAL) {
          familyPoints -= FAMILY_GOAL;
          const rewardName = nextFamilyRewardName(familyMilestonesUnlocked);
          familyMilestonesUnlocked += 1;
          familyRewardHistory.unshift({ tier: familyMilestonesUnlocked, name: rewardName, unlockedAt: now });
          celebrations.push({
            key: newId("cel"),
            emoji: "🎉",
            title: `Семья заработала: ${rewardName}!`,
            subtitle: `Общая цель ${FAMILY_GOAL} баллов выполнена — не забудьте порадовать друг друга`,
            kind: "reward",
          });
        }

        const names = members.map((m) => m.displayName).join(", ");
        set({
          members: updatedMembers,
          familyPoints,
          familyMilestonesUnlocked,
          familyRewardHistory,
          occurrences: {
            ...state.occurrences,
            [key]: { status: "completed", completedAt: now, remindersSent: 0 },
          },
          earnedBadges: [...state.earnedBadges, ...newlyEarned],
          lastCelebration: celebrations[0] ?? state.lastCelebration,
        });

        const completedMessage = `${names} выполнил(а) «${task.title}» (+${task.points})`;
        get().logActivity({
          type: "task_completed",
          memberId: members[0]?.id ?? task.creatorId,
          taskId: task.id,
          points: task.points,
          message: completedMessage,
        });
        if (state.familyCode) {
          void pushActivity(
            {
              id: "",
              familyId: state.familyCode,
              type: "task_completed",
              memberId: members[0]?.id ?? task.creatorId,
              taskId: task.id,
              points: task.points,
              message: completedMessage,
              createdAt: now,
            },
            state.familyCode,
          ).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
        for (const badge of newlyEarned) {
          const owner = state.members.find((m) => m.id === badge.memberId);
          const label = badge.badgeId.startsWith("points-")
            ? `кубок за ${Number(badge.badgeId.split("-")[1]) * 1000} баллов`
            : badge.badgeId.startsWith("streak-")
              ? `значок «${badge.badgeId.split("-")[1]} дней подряд»`
              : "значок «Ранняя пташка»";
          get().logActivity({
            type: "badge_earned",
            memberId: badge.memberId,
            message: `${owner?.displayName ?? ""} получил(а) ${label}`,
          });
        }
        if (familyMilestonesUnlocked > state.familyMilestonesUnlocked) {
          get().logActivity({
            type: "reward_unlocked",
            memberId: members[0]?.id ?? task.creatorId,
            message: `Семья набрала ${FAMILY_GOAL} баллов и заработала: ${familyRewardHistory[0]?.name}!`,
          });
        }

        playSound(
          celebrations.some((c) => c.kind === "reward") ? "reward" : celebrations.length ? "badge" : "complete",
          get().soundEnabled,
          get().soundTheme,
        );

        if (state.familyCode) {
          void pushComplete(task.id, dateISO, state.familyCode, task.points, members.map((m) => m.id));
          void notifyFamily(
            state.familyCode,
            members.map((m) => m.id),
            "✅ Задача выполнена",
            completedMessage,
            "/activity",
          ).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      refuseTask: (taskId, reason, dateISO = todayISO()) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const key = occurrenceKey(taskId, dateISO);
        const members = assigneeMembers(task.assignee, state.members, dateISO);
        const names = members.map((m) => m.displayName).join(", ");

        set({
          occurrences: {
            ...state.occurrences,
            [key]: {
              status: "refused",
              refusalReason: reason,
              remindersSent: state.occurrences[key]?.remindersSent ?? 0,
            },
          },
        });

        const refusedMessage = `${names} отметил(а), что сегодня не будет делать «${task.title}»${reason ? ` (${reason})` : ""}`;
        get().logActivity({
          type: "task_refused",
          memberId: members[0]?.id ?? task.creatorId,
          taskId: task.id,
          message: refusedMessage,
        });

        if (state.familyCode) {
          void pushRefuse(taskId, dateISO, reason);
          void pushActivity(
            {
              id: "",
              familyId: state.familyCode,
              type: "task_refused",
              memberId: members[0]?.id ?? task.creatorId,
              taskId: task.id,
              message: refusedMessage,
              createdAt: new Date().toISOString(),
            },
            state.familyCode,
          ).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
          void notifyFamily(state.familyCode, members.map((m) => m.id), "❌ Задача не будет сделана", refusedMessage, "/activity").then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      snoozeTask: (taskId, hours, dateISO = todayISO()) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        const key = occurrenceKey(taskId, dateISO);
        const current = state.occurrences[key];
        const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        set({
          occurrences: {
            ...state.occurrences,
            [key]: {
              status: "snoozed",
              snoozedUntil,
              remindersSent: (current?.remindersSent ?? 0) + 1,
            },
          },
        });
        if (!task) return;

        const members = assigneeMembers(task.assignee, state.members, dateISO);
        const names = members.map((m) => m.displayName).join(", ");
        const until = hours < 1 ? `${Math.round(hours * 60)} мин` : hours === 1 ? "час" : `${hours} ч`;
        const snoozedMessage = `${names} перенес(ла) «${task.title}» на ${until}`;
        get().logActivity({
          type: "task_postponed",
          memberId: members[0]?.id ?? task.creatorId,
          taskId: task.id,
          message: snoozedMessage,
        });

        if (state.familyCode) {
          void pushSnooze(taskId, dateISO, hours);
          void pushActivity(
            {
              id: "",
              familyId: state.familyCode,
              type: "task_postponed",
              memberId: members[0]?.id ?? task.creatorId,
              taskId: task.id,
              message: snoozedMessage,
              createdAt: new Date().toISOString(),
            },
            state.familyCode,
          ).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
          void notifyFamily(
            state.familyCode,
            members.map((m) => m.id),
            "⏳ Задача перенесена",
            snoozedMessage,
            "/activity",
          ).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      addTask: (input) => {
        const id = newId("task");
        const now = new Date().toISOString();
        const task: Task = { id, familyId: FAMILY_ID, createdAt: now, updatedAt: now, ...input };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        playSound("created", get().soundEnabled, get().soundTheme);

        const state = get();
        const creator = state.members.find((m) => m.id === input.creatorId);
        const assignees = assigneePoolMembers(input.assignee, state.members);
        const assigneeNames = assignees.map((m) => m.displayName).join(", ") || "кому-то";
        const assigneeLabel =
          input.assignee.kind === "family"
            ? "всем"
            : input.assignee.kind === "rotation"
              ? `по очереди (${assigneeNames})`
              : assigneeNames;
        const message = `${creator?.displayName ?? "Кто-то"} назначил(а) новую задачу «${task.title}»: ${assigneeLabel}`;

        // Logged locally (and synced below) even without a push
        // notification arriving — so "a task got assigned to me" is
        // always visible in Activity, not only as a fragile push.
        get().logActivity({ type: "task_assigned", memberId: input.creatorId, taskId: task.id, message });

        const code = state.familyCode;
        if (code) {
          void pushTask(task, code).then((r) => {
            if (!r.ok) {
              set({ lastSyncError: r.error });
              return;
            }
            // Only push the activity record once the task row actually
            // exists server-side — firing both at once raced against
            // pushTask's own insert, and family_activity.task_id's
            // foreign key silently rejected the activity row whenever
            // it lost that race, which is why "Наташа назначила..."
            // could go missing on other devices despite showing fine
            // locally for whoever created the task.
            void pushActivity(
              { id: "", familyId: code, type: "task_assigned", memberId: input.creatorId, taskId: task.id, message, createdAt: now },
              code,
            ).then((r2) => {
              if (!r2.ok) set({ lastSyncError: r2.error });
            });
          });
          // Unlike completing/refusing/postponing, the creator gets this
          // one too — they explicitly asked to see "new task" land on
          // their own phone as well, including a task assigned to
          // themselves or to the whole family.
          void notifyFamily(code, [], "🆕 Новая задача", message, `/tasks/remind?id=${task.id}&reason=assigned`).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
        return id;
      },

      removeTask: (taskId) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
        const code = get().familyCode;
        if (code) {
          void deleteRemoteTask(taskId).then((result) => {
            // If the remote delete silently failed (e.g. a device whose
            // cloud schema is missing a column this needs), the next
            // sync pull would otherwise resurrect it with no explanation.
            if (!result.ok) set({ lastSyncError: result.error });
          });
        }
      },

      addGuide: (title, content) => {
        const id = newId("guide");
        const now = new Date().toISOString();
        const guide: Guide = { id, familyId: FAMILY_ID, title: title.trim(), content, updatedAt: now };
        set((state) => ({ guides: [guide, ...state.guides] }));
        const code = get().familyCode;
        if (code) {
          void pushGuide(guide, code).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
        return id;
      },

      updateGuide: (id, fields) => {
        set((state) => ({
          guides: state.guides.map((g) =>
            g.id === id ? { ...g, ...fields, updatedAt: new Date().toISOString() } : g,
          ),
        }));
        const code = get().familyCode;
        const updated = get().guides.find((g) => g.id === id);
        if (code && updated) {
          void pushGuide(updated, code).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      removeGuide: (id) => {
        set((state) => ({ guides: state.guides.filter((g) => g.id !== id) }));
        const code = get().familyCode;
        if (code) {
          void deleteRemoteGuide(id).then((result) => {
            if (!result.ok) set({ lastSyncError: result.error });
          });
        }
      },

      addMember: (name, accentColor) => {
        const state = get();
        const color = accentColor ?? ACCENT_CYCLE[state.members.length % ACCENT_CYCLE.length]!;
        const member = freshMember(name, color);
        set({ members: [...state.members, member] });
        get().logActivity({
          type: "member_joined",
          memberId: member.id,
          message: `${name} присоединил(ась) к семье`,
        });
        playSound("created", get().soundEnabled, get().soundTheme);
        const code = get().familyCode;
        if (code) {
          void pushMember(member, code).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
        return member.id;
      },

      removeMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          whoAmI: state.whoAmI === id ? null : state.whoAmI,
        }));
        const code = get().familyCode;
        if (code) {
          void deleteRemoteMember(id).then((result) => {
            if (!result.ok) set({ lastSyncError: result.error });
          });
        }
      },

      updateMemberPhoto: (id, photoUrl) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, photoUrl, updatedAt: new Date().toISOString() } : m,
          ),
        }));
        const code = get().familyCode;
        const updated = get().members.find((m) => m.id === id);
        if (code && updated) {
          void pushMember(updated, code).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      renameMember: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, displayName: trimmed, updatedAt: new Date().toISOString() } : m,
          ),
        }));
        const code = get().familyCode;
        const updated = get().members.find((m) => m.id === id);
        if (code && updated) {
          void pushMember(updated, code).then((r) => {
            if (!r.ok) set({ lastSyncError: r.error });
          });
        }
      },

      setWhoAmI: (id) => set({ whoAmI: id }),
      finishOnboarding: () => set({ onboardingComplete: true }),
      markPushPromptSeen: () => set({ pushPromptSeen: true }),

      resetAll: () => set({ ...EMPTY_STATE }),

      enableSync: async () => {
        const state = get();
        const code = newId("family");
        const result = await createRemoteFamily(code, "Наша семья");
        if (!result.ok) {
          set({ lastSyncError: result.error });
          return null;
        }
        set({ familyCode: code, lastSyncedAt: new Date().toISOString(), lastSyncError: null });
        await Promise.all(state.members.map((m) => pushMember(m, code)));
        await Promise.all(state.tasks.map((t) => pushTask(t, code)));
        await Promise.all(state.guides.map((g) => pushGuide(g, code)));
        return code;
      },

      joinSync: async (code) => {
        set({ syncing: true });
        const trimmed = code.trim();
        const result = await fetchSnapshot(trimmed);
        if (!result.ok) {
          set({ syncing: false, lastSyncError: result.error });
          return false;
        }
        const state = get();
        const merged = mergeSnapshot(state, result.snapshot);

        // Onboarding forces every fresh device to create a local "me"
        // member before it can even reach Settings to join a family —
        // so a device joining an EXISTING family always walks in with a
        // throwaway duplicate of whoever it already typed as "me". If
        // that name matches someone already in the family being joined,
        // treat them as the same person instead of leaving two "Наташа"
        // entries around.
        let members = merged.members;
        let whoAmI = state.whoAmI;
        const remoteIds = new Set(result.snapshot.members.map((m) => m.id));
        const strayLocal = state.members.find((m) => m.id === state.whoAmI && !remoteIds.has(m.id));
        if (strayLocal) {
          const match = result.snapshot.members.find(
            (m) => m.id !== strayLocal.id && m.displayName.trim().toLowerCase() === strayLocal.displayName.trim().toLowerCase(),
          );
          if (match) {
            members = members.filter((m) => m.id !== strayLocal.id);
            whoAmI = match.id;
            void deleteRemoteMember(strayLocal.id);
          }
        }

        set({
          familyCode: trimmed,
          ...merged,
          members,
          whoAmI,
          lastSyncedAt: new Date().toISOString(),
          syncing: false,
          lastSyncError: null,
        });
        // Any local-only data (created before this device joined) needs
        // pushing up, or it only exists here and vanishes on next pull.
        await Promise.all(members.map((m) => pushMember(m, trimmed)));
        await Promise.all(merged.tasks.map((t) => pushTask(t, trimmed)));
        await Promise.all(merged.guides.map((g) => pushGuide(g, trimmed)));
        return true;
      },

      pullSync: async () => {
        const code = get().familyCode;
        if (!code) return;
        set({ syncing: true });
        const result = await fetchSnapshot(code);
        if (!result.ok) {
          set({ syncing: false, lastSyncError: result.error });
          return;
        }
        const state = get();
        const merged = mergeSnapshot(state, result.snapshot);
        set({
          ...merged,
          lastSyncedAt: new Date().toISOString(),
          syncing: false,
          lastSyncError: null,
        });
      },

      clearSyncError: () => set({ lastSyncError: null }),

      leaveSync: () => set({ familyCode: null, lastSyncedAt: null }),

      wipeCloudFamily: async () => {
        set({ syncing: true });
        const result = await wipeAllCloudFamilies();
        if (!result.ok) {
          set({ syncing: false, lastSyncError: result.error });
          return false;
        }
        set({ familyCode: null, lastSyncedAt: null, syncing: false, lastSyncError: null });
        return true;
      },

      setCustomSupabaseConfig: (url, key) => {
        setCustomSupabase(url, key);
        set({ customSupabaseUrl: url, customSupabaseKey: key, familyCode: null, lastSyncedAt: null });
      },

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setSoundTheme: (theme) => set({ soundTheme: theme }),
      dismissCelebration: () => set({ lastCelebration: null }),
    }),
    {
      name: "family-hub-storage",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Server-rendered HTML can't see localStorage, so the first paint
      // must use the same in-memory empty state on both server and
      // client — see components/OnboardingGate.tsx, which waits for
      // `hasHydrated` before deciding what to show.
      skipHydration: true,
      migrate: () => ({ ...EMPTY_STATE }),
    },
  ),
);
