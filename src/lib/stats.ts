// Counters derived from the shared activity log, so every phone shows the
// same numbers. The per-member counters stored on the server
// (completed_task_count, current_streak) only began counting once the
// completion RPC was fixed, which is why they read "1 день подряд".
import { todayISO } from "./schedule";
import type { ActivityEvent, FamilyMember } from "./types";

/** Points for a new trophy — one for every full thousand. */
export const TROPHY_EVERY = 1000;

/**
 * Who a "готово" entry credited. Since shared tasks went per person it's
 * the entry's member; older entries credited everyone they name
 * ("Маша, Наташа, Ваня выполнил(а) …").
 */
export function creditedMemberIds(event: ActivityEvent, members: FamilyMember[]): string[] {
  const head = event.message.split("«")[0] ?? "";
  if (!head.includes(",")) return event.memberId ? [event.memberId] : [];
  const namesPart = head.split(/ — | выполнил/)[0] ?? "";
  const ids = namesPart
    .split(",")
    .map((n) => members.find((m) => m.displayName === n.trim())?.id)
    .filter((id): id is string => !!id);
  return ids.length ? ids : event.memberId ? [event.memberId] : [];
}

function completions(activity: ActivityEvent[]): ActivityEvent[] {
  return activity.filter((e) => e.type === "task_completed");
}

/** Consecutive days with at least one completion, ending today (or yesterday, if nothing yet today). */
function streakFromDates(dates: Set<string>): number {
  const day = new Date();
  if (!dates.has(todayISO(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (dates.has(todayISO(day))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

function bestStreakFromDates(dates: Set<string>): number {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const next = new Date(`${prev}T12:00:00`);
      next.setDate(next.getDate() + 1);
      run = todayISO(next) === d ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export interface MemberStats {
  completed: number;
  streak: number;
  bestStreak: number;
}

export function memberStats(activity: ActivityEvent[], members: FamilyMember[], memberId: string): MemberStats {
  const mine = completions(activity).filter((e) => creditedMemberIds(e, members).includes(memberId));
  const dates = new Set(mine.map((e) => todayISO(new Date(e.createdAt))));
  return { completed: mine.length, streak: streakFromDates(dates), bestStreak: bestStreakFromDates(dates) };
}

export interface FamilyStats {
  completed: number;
  streak: number;
}

export function familyStats(activity: ActivityEvent[]): FamilyStats {
  const done = completions(activity);
  return { completed: done.length, streak: streakFromDates(new Set(done.map((e) => todayISO(new Date(e.createdAt))))) };
}

/** Points still needed for this person's next trophy. */
export function pointsToNextTrophy(points: number): number {
  return TROPHY_EVERY - (points % TROPHY_EVERY);
}
