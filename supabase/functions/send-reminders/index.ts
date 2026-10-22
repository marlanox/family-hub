// Supabase Edge Function: the actual "it's time to do this" reminder —
// as opposed to send-push, which only fires right when something already
// happened (assigned/completed/refused/postponed). Nothing on a phone can
// fire this by itself if the app isn't open, so this function is meant to
// be invoked on a schedule (every few minutes) by Supabase's own Cron —
// see README.md for the one-time setup (deploy this function, then add a
// Cron job that calls it).
//
// Each run: for every family, works out "now" in that family's own
// timezone, finds tasks due that haven't been dealt with yet today, and
// sends a push for each (deep-linking straight to the snooze/refuse
// screen). Cadence: once at the due time, then at most once an hour
// while nobody reacts, and no more than MAX_AUTO_REMINDERS a day — it
// used to fire on every sweep (every few minutes), which piled up dozens
// of notifications on a phone nobody was looking at. A snooze the person
// chose ("через 15 минут / час") is always honoured once it runs out.
// Each reminder carries a per-task tag, so a new one replaces the
// previous banner instead of stacking.
//
// Deploy: paste this file's contents into Supabase Dashboard → Edge
// Functions → "send-reminders" → the code editor, then Deploy. It reuses
// the same VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets as send-push — no
// new secrets needed. Then add the Cron job (README.md has the exact
// steps) so this actually runs every few minutes instead of sitting idle.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:family-hub@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function nowInZone(tz: string): { dateISO: string; minutesSinceMidnight: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get("weekday")] ?? 0;
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutesSinceMidnight: Number(get("hour")) * 60 + Number(get("minute")),
    dow,
  };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Mirrors src/lib/schedule.ts isScheduledOn() — keep these two in sync.
function isScheduledToday(
  recurrence: { type: string; daysOfWeek?: number[] },
  onceDate: string | null,
  dow: number,
  todayISO: string,
): boolean {
  switch (recurrence?.type) {
    case "once":
      return onceDate === todayISO;
    case "daily":
    case "times_per_day":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "custom_days":
      return recurrence.daysOfWeek?.includes(dow) ?? false;
    case "times_per_week":
      return true;
    default:
      return false;
  }
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assignee: { kind: string; memberIds?: string[] };
  due_time: string;
  recurrence: { type: string; daysOfWeek?: number[] };
  once_date: string | null;
}

// Mirrors src/lib/schedule.ts resolveAssigneeIds() — keep these two in
// sync. Without this, a "rotation" assignee fell through to the plain
// memberIds branch below and got treated as "everyone in the pool, every
// time" instead of "whoever's week it actually is" — so e.g. a litter-box
// task alternating Маша/Наташа nagged BOTH of them every sweep, including
// the one who isn't even on duty that week and can't act on it in the app.
const ROTATION_EPOCH = Date.UTC(2024, 0, 1);

function weekIndexFor(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00Z`).getTime();
  return Math.floor((d - ROTATION_EPOCH) / (7 * 86400000));
}

function resolveAssigneeIds(
  assignee: { kind: string; memberIds?: string[] },
  dateISO: string,
  allMemberIds: string[],
): string[] {
  if (assignee?.kind === "family") return allMemberIds;
  const memberIds = assignee?.memberIds ?? [];
  if (assignee?.kind !== "rotation") return memberIds;
  if (memberIds.length === 0) return [];
  const idx = ((weekIndexFor(dateISO) % memberIds.length) + memberIds.length) % memberIds.length;
  return [memberIds[idx]!];
}

interface OccurrenceRow {
  task_id: string;
  scheduled_for: string;
  status: string;
  snoozed_until: string | null;
  completed_at: string | null;
  refused_at: string | null;
  reminders_sent: number;
}

function shiftDate(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Phones record completions/snoozes under their OWN local calendar date,
// while this sweep works in the family's configured timezone — if those
// two disagree (wrong timezone in the families table, a phone set to
// another zone), an exact scheduled_for match misses the completion and
// the alarm keeps going forever after "Сделано". So "dealt with today" is
// judged by the actual moment it happened, against the start of the
// family's day, across the neighbouring dates too.
const MAX_AUTO_REMINDERS = 3;
const REMIND_EVERY_MS = 60 * 60 * 1000;

function isDealtWith(occs: OccurrenceRow[], dateISO: string, dayStartMs: number, nowMs: number): boolean {
  return occs.some((o) => {
    if (o.scheduled_for === dateISO && (o.status === "completed" || o.status === "refused" || o.status === "cancelled")) {
      return true;
    }
    if (o.status === "completed" && o.completed_at && new Date(o.completed_at).getTime() >= dayStartMs) return true;
    if (o.status === "refused" && o.refused_at && new Date(o.refused_at).getTime() >= dayStartMs) return true;
    if (o.status === "snoozed" && o.snoozed_until && new Date(o.snoozed_until).getTime() > nowMs) return true;
    // Today's row also uses snoozed_until as "next automatic reminder no
    // earlier than" (see below), whatever its status.
    if (o.scheduled_for === dateISO && o.snoozed_until && new Date(o.snoozed_until).getTime() > nowMs) return true;
    return false;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID secrets not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let totalSent = 0;

  try {
    const { data: families } = await supabase.from("families").select("id, timezone");

    for (const family of families ?? []) {
      const tz = (family.timezone as string) || "Europe/Moscow";
      const { dateISO, minutesSinceMidnight, dow } = nowInZone(tz);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description, assignee, due_time, recurrence, once_date")
        .eq("family_id", family.id)
        .is("deleted_at", null)
        .eq("reminder_enabled", true)
        .not("due_time", "is", null);

      // No upper bound here on purpose: once a task is due, it stays a
      // candidate for the rest of the day — the alarm-clock nagging is
      // supposed to continue indefinitely until it's dealt with, not
      // stop after some fixed number of minutes. (It used to cap at 10
      // minutes past due_time, which silently broke nagging after ANY
      // snooze — 15 min/1h/3h are all past that cap — so the second
      // reminder a snoozed task was supposed to get just never fired.
      // The isDealtWith check below is what actually silences a task
      // now: completed/refused today, or an unexpired snooze.)
      const dueTasks = ((tasks ?? []) as TaskRow[]).filter((t) => {
        if (!isScheduledToday(t.recurrence, t.once_date, dow, dateISO)) return false;
        return minutesSinceMidnight >= toMinutes(t.due_time);
      });
      if (dueTasks.length === 0) continue;

      const nowMs = Date.now();
      const dayStartMs = nowMs - (minutesSinceMidnight + 1) * 60000;
      const { data: occRows } = await supabase
        .from("task_occurrences")
        .select("task_id, scheduled_for, status, snoozed_until, completed_at, refused_at, reminders_sent")
        .in("task_id", dueTasks.map((t) => t.id))
        .in("scheduled_for", [shiftDate(dateISO, -1), dateISO, shiftDate(dateISO, 1)]);
      const occsByTask = new Map<string, OccurrenceRow[]>();
      for (const o of (occRows ?? []) as OccurrenceRow[]) {
        occsByTask.set(o.task_id, [...(occsByTask.get(o.task_id) ?? []), o]);
      }

      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", family.id)
        .is("deleted_at", null);
      const allMemberIds = (familyMembers ?? []).map((m: { id: string }) => m.id);

      for (const task of dueTasks) {
        const occs = occsByTask.get(task.id) ?? [];
        const occ = occs.find((o) => o.scheduled_for === dateISO);
        // Silent when dealt with today (completed/refused), while a snooze
        // or the hourly wait hasn't run out, and once today's automatic
        // reminders are used up — unless this is a snooze the person asked
        // for that just expired: that one always rings.
        if (isDealtWith(occs, dateISO, dayStartMs, nowMs)) continue;
        if (occ && occ.status !== "snoozed" && (occ.reminders_sent ?? 0) >= MAX_AUTO_REMINDERS) continue;

        const targetIds = resolveAssigneeIds(task.assignee, dateISO, allMemberIds);
        if (targetIds.length === 0) continue;

        const { data: subs } = await supabase.from("push_subscriptions").select("*").in("member_id", targetIds);
        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: `⏰ Пора делать: ${task.title}`,
                body: task.description || "Отметь, что сделал(а), или перенеси время",
                tag: `task-${task.id}`,
                data: { url: `/tasks/remind?id=${task.id}` },
              }),
            );
            totalSent++;
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }
        }

        // Count it and hold the next one off for an hour (snoozed_until
        // doubles as "not before"). Writes are conditional on the row not
        // being done, so a "Сделано" that lands mid-sweep is never undone.
        // An expired user snooze turns back into a plain pending reminder,
        // so the daily cap applies from here on.
        const nextAt = new Date(nowMs + REMIND_EVERY_MS).toISOString();
        if (occ) {
          await supabase
            .from("task_occurrences")
            .update({ reminders_sent: (occ.reminders_sent ?? 0) + 1, snoozed_until: nextAt })
            .eq("task_id", task.id)
            .eq("scheduled_for", dateISO)
            .in("status", ["pending", "snoozed", "missed"]);
          await supabase
            .from("task_occurrences")
            .update({ status: "pending" })
            .eq("task_id", task.id)
            .eq("scheduled_for", dateISO)
            .eq("status", "snoozed");
        } else {
          await supabase
            .from("task_occurrences")
            .insert({ task_id: task.id, scheduled_for: dateISO, status: "pending", reminders_sent: 1, snoozed_until: nextAt });
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
