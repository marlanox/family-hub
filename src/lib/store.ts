"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isScheduledOn, occurrenceKey, todayISO } from "./schedule";
import { playSound } from "./sound";
import {
  createRemoteFamily,
  fetchSnapshot,
  pushActivity,
  pushComplete,
  pushMember,
  pushRefuse,
  pushSnooze,
  pushTask,
} from "./sync";
import type {
  ActivityEvent,
  Difficulty,
  EarnedBadge,
  FamilyMember,
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

function newId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
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
  familyPoints: number;
  familyMilestonesUnlocked: number;
  familyRewardHistory: FamilyRewardHistoryEntry[];
  soundEnabled: boolean;
  whoAmI: string | null;
  onboardingComplete: boolean;
  hasHydrated: boolean;
  lastCelebration: Celebration | null;
  familyCode: string | null;
  lastSyncedAt: string | null;
  syncing: boolean;

  occurrenceFor: (taskId: string, dateISO?: string) => OccurrenceRecord;
  todaysTasks: (dateISO?: string) => Task[];
  currentFamilyRewardName: () => string;

  completeTask: (taskId: string, dateISO?: string) => void;
  refuseTask: (taskId: string, reason: string | undefined, dateISO?: string) => void;
  snoozeTask: (taskId: string, hours: number, dateISO?: string) => void;
  addTask: (input: NewTaskInput) => string;
  removeTask: (taskId: string) => void;
  addMember: (name: string, accentColor?: FamilyMember["accentColor"]) => string;
  removeMember: (id: string) => void;
  updateMemberPhoto: (id: string, photoUrl: string | null) => void;
  setWhoAmI: (id: string | null) => void;
  finishOnboarding: () => void;
  resetAll: () => void;
  enableSync: () => Promise<string | null>;
  joinSync: (code: string) => Promise<boolean>;
  pullSync: () => Promise<void>;
  leaveSync: () => void;
  toggleSound: () => void;
  dismissCelebration: () => void;
  logActivity: (event: Omit<ActivityEvent, "id" | "familyId" | "createdAt">) => void;
}

function assigneeMembers(assignee: TaskAssignee, members: FamilyMember[]): FamilyMember[] {
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
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    active: true,
    createdAt: new Date().toISOString(),
  };
}

const EMPTY_STATE = {
  members: [] as FamilyMember[],
  tasks: [] as Task[],
  occurrences: {} as Record<string, OccurrenceRecord>,
  activity: [] as ActivityEvent[],
  earnedBadges: [] as EarnedBadge[],
  familyPoints: 0,
  familyMilestonesUnlocked: 0,
  familyRewardHistory: [] as FamilyRewardHistoryEntry[],
  whoAmI: null as string | null,
  onboardingComplete: false,
  familyCode: null as string | null,
  lastSyncedAt: null as string | null,
};

export const useFamilyStore = create<FamilyHubState>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,
      soundEnabled: true,
      hasHydrated: false,
      lastCelebration: null,
      syncing: false,

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

        const members = assigneeMembers(task.assignee, state.members);
        const now = new Date().toISOString();
        const hourNow = new Date().getHours();
        const celebrations: Celebration[] = [];
        const newlyEarned: EarnedBadge[] = [];

        const updatedMembers = state.members.map((m) => {
          if (!members.some((am) => am.id === m.id)) return m;
          const nextStreak = m.currentStreak + 1;
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
          if (nextStreak === 7 || nextStreak === 30) {
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
          );
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
        );

        if (state.familyCode) {
          void pushComplete(task.id, dateISO, state.familyCode, task.points, members.map((m) => m.id));
        }
      },

      refuseTask: (taskId, reason, dateISO = todayISO()) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const key = occurrenceKey(taskId, dateISO);
        const members = assigneeMembers(task.assignee, state.members);
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
          );
        }
      },

      snoozeTask: (taskId, hours, dateISO = todayISO()) => {
        const state = get();
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

        if (state.familyCode) {
          void pushSnooze(taskId, dateISO, hours);
        }
      },

      addTask: (input) => {
        const id = newId("task");
        const now = new Date().toISOString();
        const task: Task = { id, familyId: FAMILY_ID, createdAt: now, updatedAt: now, ...input };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        playSound("created", get().soundEnabled);
        const code = get().familyCode;
        if (code) void pushTask(task, code);
        return id;
      },

      removeTask: (taskId) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
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
        playSound("created", get().soundEnabled);
        const code = get().familyCode;
        if (code) void pushMember(member, code);
        return member.id;
      },

      removeMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          whoAmI: state.whoAmI === id ? null : state.whoAmI,
        }));
      },

      updateMemberPhoto: (id, photoUrl) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, photoUrl } : m)),
        }));
        const code = get().familyCode;
        const updated = get().members.find((m) => m.id === id);
        if (code && updated) void pushMember(updated, code);
      },

      setWhoAmI: (id) => set({ whoAmI: id }),
      finishOnboarding: () => set({ onboardingComplete: true }),

      resetAll: () => set({ ...EMPTY_STATE }),

      enableSync: async () => {
        const state = get();
        const code = newId("family");
        const ok = await createRemoteFamily(code, "Наша семья");
        if (!ok) return null;
        set({ familyCode: code, lastSyncedAt: new Date().toISOString() });
        await Promise.all(state.members.map((m) => pushMember(m, code)));
        await Promise.all(state.tasks.map((t) => pushTask(t, code)));
        return code;
      },

      joinSync: async (code) => {
        set({ syncing: true });
        const snapshot = await fetchSnapshot(code.trim());
        if (!snapshot) {
          set({ syncing: false });
          return false;
        }
        set({
          familyCode: code.trim(),
          members: snapshot.members,
          tasks: snapshot.tasks,
          occurrences: snapshot.occurrences as FamilyHubState["occurrences"],
          activity: snapshot.activity,
          earnedBadges: snapshot.earnedBadges,
          familyPoints: snapshot.familyPoints,
          familyMilestonesUnlocked: snapshot.familyMilestonesUnlocked,
          familyRewardHistory: snapshot.familyRewardHistory,
          whoAmI: null,
          lastSyncedAt: new Date().toISOString(),
          syncing: false,
        });
        return true;
      },

      pullSync: async () => {
        const code = get().familyCode;
        if (!code) return;
        set({ syncing: true });
        const snapshot = await fetchSnapshot(code);
        if (!snapshot) {
          set({ syncing: false });
          return;
        }
        set({
          members: snapshot.members,
          tasks: snapshot.tasks,
          occurrences: snapshot.occurrences as FamilyHubState["occurrences"],
          activity: snapshot.activity,
          earnedBadges: snapshot.earnedBadges,
          familyPoints: snapshot.familyPoints,
          familyMilestonesUnlocked: snapshot.familyMilestonesUnlocked,
          familyRewardHistory: snapshot.familyRewardHistory,
          lastSyncedAt: new Date().toISOString(),
          syncing: false,
        });
      },

      leaveSync: () => set({ familyCode: null, lastSyncedAt: null }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
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
