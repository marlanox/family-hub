import type { Task } from "./types";

export function todayISO(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
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
