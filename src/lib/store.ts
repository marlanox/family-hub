"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoFamily, demoMembers, demoTasksToday } from "./demoData";
import { isScheduledOn, occurrenceKey, todayISO } from "./schedule";
import { playSound } from "./sound";
import type {
  ActivityEvent,
  Difficulty,
  EarnedBadge,
  FamilyMember,
  IconKey,
  OccurrenceStatus,
  Recurrence,
  Reward,
  Task,
  TaskAssignee,
} from "./types";

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

interface FamilyHubState {
  members: FamilyMember[];
  tasks: Task[];
  occurrences: Record<string, OccurrenceRecord>;
  activity: ActivityEvent[];
  rewards: Reward[];
  earnedBadges: EarnedBadge[];
  familyPoints: number;
  familyMilestonesUnlocked: number;
  soundEnabled: boolean;
  lastCelebration: Celebration | null;

  occurrenceFor: (taskId: string, dateISO?: string) => OccurrenceRecord;
  todaysTasks: (dateISO?: string) => Task[];

  completeTask: (taskId: string, dateISO?: string) => void;
  refuseTask: (taskId: string, reason: string | undefined, dateISO?: string) => void;
  snoozeTask: (taskId: string, hours: number, dateISO?: string) => void;
  addTask: (input: NewTaskInput) => string;
  removeTask: (taskId: string) => void;
  addMember: (name: string, accentColor: FamilyMember["accentColor"]) => string;
  removeMember: (id: string) => void;
  updateMemberPhoto: (id: string, photoUrl: string | null) => void;
  redeemReward: (id: string) => void;
  addReward: (input: Omit<Reward, "id" | "familyId" | "redeemed" | "redeemedAt">) => void;
  toggleSound: () => void;
  dismissCelebration: () => void;
  logActivity: (event: Omit<ActivityEvent, "id" | "familyId" | "createdAt">) => void;
}

function assigneeMembers(assignee: TaskAssignee, members: FamilyMember[]): FamilyMember[] {
  if (assignee.kind === "family") return members;
  return members.filter((m) => assignee.memberIds.includes(m.id));
}

const defaultRewards: Reward[] = [
  {
    id: "r-family-1000",
    familyId: demoFamily.id,
    name: "Мини-подарок от семьи",
    icon: "gift",
    pointsRequired: 1000,
    scope: "family",
    redeemed: false,
    isMilestone: true,
  },
  {
    id: "r-dessert",
    familyId: demoFamily.id,
    name: "Выбрать десерт на ужин",
    icon: "food",
    pointsRequired: 150,
    scope: "individual",
    redeemed: false,
  },
  {
    id: "r-movie",
    familyId: demoFamily.id,
    name: "Кино всей семьёй",
    icon: "star",
    pointsRequired: 500,
    scope: "family",
    redeemed: false,
  },
];

export const useFamilyStore = create<FamilyHubState>()(
  persist(
    (set, get) => ({
      members: demoMembers,
      tasks: demoTasksToday,
      occurrences: {},
      activity: [],
      rewards: defaultRewards,
      earnedBadges: [],
      familyPoints: 710,
      familyMilestonesUnlocked: 0,
      soundEnabled: true,
      lastCelebration: null,

      occurrenceFor: (taskId, dateISO = todayISO()) => {
        const key = occurrenceKey(taskId, dateISO);
        return get().occurrences[key] ?? { status: "pending", remindersSent: 0 };
      },

      todaysTasks: (dateISO = todayISO()) => {
        const date = new Date(`${dateISO}T12:00:00`);
        return get().tasks.filter((t) => isScheduledOn(t, date));
      },

      logActivity: (event) => {
        set((state) => ({
          activity: [
            {
              ...event,
              id: newId("activity"),
              familyId: demoFamily.id,
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
          const nextLifetime = m.lifetimePoints + task.points;
          const prevTier = Math.floor(m.lifetimePoints / 1000);
          const nextTier = Math.floor(nextLifetime / 1000);

          if (nextTier > prevTier) {
            const badge: EarnedBadge = {
              memberId: m.id,
              badgeId: `points-${nextTier}`,
              earnedAt: now,
            };
            newlyEarned.push(badge);
            celebrations.push({
              key: newId("cel"),
              emoji: "🎉",
              title: `${m.displayName} набрал(а) ${nextTier * 1000} баллов!`,
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
            points: m.points + task.points,
            lifetimePoints: nextLifetime,
            currentStreak: nextStreak,
            longestStreak: Math.max(m.longestStreak, nextStreak),
            completedTaskCount: m.completedTaskCount + 1,
          };
        });

        let familyPoints = state.familyPoints + task.points;
        let familyMilestonesUnlocked = state.familyMilestonesUnlocked;
        while (familyPoints >= 1000) {
          familyPoints -= 1000;
          familyMilestonesUnlocked += 1;
          celebrations.push({
            key: newId("cel"),
            emoji: "🎁",
            title: "Семья набрала 1000 баллов!",
            subtitle: "Загляните в «Награды» — там подарок",
            kind: "reward",
          });
        }

        const names = members.map((m) => m.displayName).join(", ");
        set({
          members: updatedMembers,
          familyPoints,
          familyMilestonesUnlocked,
          occurrences: {
            ...state.occurrences,
            [key]: { status: "completed", completedAt: now, remindersSent: 0 },
          },
          earnedBadges: [...state.earnedBadges, ...newlyEarned],
          lastCelebration: celebrations[0] ?? state.lastCelebration,
        });

        get().logActivity({
          type: "task_completed",
          memberId: members[0]?.id ?? task.creatorId,
          taskId: task.id,
          points: task.points,
          message: `${names} выполнил(а) «${task.title}» (+${task.points})`,
        });

        playSound(celebrations.some((c) => c.kind === "reward") ? "reward" : celebrations.length ? "badge" : "complete", get().soundEnabled);
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

        get().logActivity({
          type: "task_refused",
          memberId: members[0]?.id ?? task.creatorId,
          taskId: task.id,
          message: `${names} отметил(а), что сегодня не будет делать «${task.title}»${reason ? ` (${reason})` : ""}`,
        });
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
      },

      addTask: (input) => {
        const id = newId("task");
        const now = new Date().toISOString();
        const task: Task = { id, familyId: demoFamily.id, createdAt: now, updatedAt: now, ...input };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        playSound("created", get().soundEnabled);
        return id;
      },

      removeTask: (taskId) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
      },

      addMember: (name, accentColor) => {
        const id = newId("member");
        const member: FamilyMember = {
          id,
          familyId: demoFamily.id,
          displayName: name,
          photoUrl: null,
          accentColor,
          points: 0,
          lifetimePoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          completedTaskCount: 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          active: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ members: [...state.members, member] }));
        get().logActivity({
          type: "member_joined",
          memberId: id,
          message: `${name} присоединил(ась) к семье`,
        });
        playSound("created", get().soundEnabled);
        return id;
      },

      removeMember: (id) => {
        set((state) => ({ members: state.members.filter((m) => m.id !== id) }));
      },

      updateMemberPhoto: (id, photoUrl) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, photoUrl } : m)),
        }));
      },

      redeemReward: (id) => {
        const state = get();
        const reward = state.rewards.find((r) => r.id === id);
        if (!reward) return;
        set({
          rewards: state.rewards.map((r) =>
            r.id === id ? { ...r, redeemed: true, redeemedAt: new Date().toISOString() } : r,
          ),
          lastCelebration: {
            key: newId("cel"),
            emoji: "🏆",
            title: `Награда «${reward.name}» получена!`,
            subtitle: "Не забудьте порадовать друг друга",
            kind: "reward",
          },
        });
        get().logActivity({
          type: "reward_unlocked",
          memberId: reward.memberId ?? state.members[0]?.id ?? "",
          message: `Семья получила награду «${reward.name}»`,
        });
        playSound("reward", get().soundEnabled);
      },

      addReward: (input) => {
        set((state) => ({
          rewards: [
            ...state.rewards,
            { ...input, id: newId("reward"), familyId: demoFamily.id, redeemed: false },
          ],
        }));
      },

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      dismissCelebration: () => set({ lastCelebration: null }),
    }),
    {
      name: "family-hub-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Server-rendered HTML can't see localStorage, so the first paint
      // must use the same in-memory demo state on both server and
      // client — see components/StoreHydrator.tsx, which triggers the
      // real rehydration right after mount to avoid a hydration mismatch.
      skipHydration: true,
    },
  ),
);
