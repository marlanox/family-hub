import type { Task } from "./types";

// Local calendar date, NOT UTC — d.toISOString() shifts to UTC, which
// disagrees with the local date for part of the day in any positive-UTC
// timezone (e.g. Russia, UTC+3..+12): between local midnight and the
// UTC offset's worth of hours after it, toISOString() still reports
// "yesterday". That mismatch broke "is this task scheduled today" right
// at the boundary, and it's also what <input type="date"> and every
// occurrence key need to agree with.
export function todayISO(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Is this task scheduled to appear on the given date at all? */
export function isScheduledOn(task: Task, date: Date): boolean {
  const dow = date.getDay();
  const iso = todayISO(date);

  switch (task.recurrence.type) {
    case "once":
      return task.onceDate === iso;
    case "daily":
    case "times_per_day":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "custom_days":
      return task.recurrence.daysOfWeek?.includes(dow) ?? false;
    case "times_per_week":
      // Simplified: offered every day until the weekly quota is met
      // (quota tracking happens via completedThisWeek in the store).
      return true;
    default:
      return false;
  }
}

export function occurrenceKey(taskId: string, dateISO: string): string {
  return `${taskId}__${dateISO}`;
}
