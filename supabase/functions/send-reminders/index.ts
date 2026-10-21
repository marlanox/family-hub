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
// screen) — deliberately on every sweep, not just once, like a real
// alarm clock: it keeps nagging every few minutes until the task is
// completed/refused, or until an active snooze's time hasn't run out
// yet (that pauses it; once the snooze expires, nagging resumes).
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

interface OccurrenceRow {
  task_id: string;
  status: string;
  snoozed_until: string | null;
  reminders_sent: number;
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
      // The isDone/stillSnoozing check below is what actually silences
      // a task now: completed/refused, or an unexpired snooze.)
      const dueTasks = ((tasks ?? []) as TaskRow[]).filter((t) => {
        if (!isScheduledToday(t.recurrence, t.once_date, dow, dateISO)) return false;
        return minutesSinceMidnight >= toMinutes(t.due_time);
      });
      if (dueTasks.length === 0) continue;

      const { data: occRows } = await supabase
        .from("task_occurrences")
        .select("task_id, status, snoozed_until, reminders_sent")
        .in("task_id", dueTasks.map((t) => t.id))
        .eq("scheduled_for", dateISO);
      const occByTask = new Map(((occRows ?? []) as OccurrenceRow[]).map((o) => [o.task_id, o]));

      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", family.id)
        .is("deleted_at", null);
      const allMemberIds = (familyMembers ?? []).map((m: { id: string }) => m.id);

      for (const task of dueTasks) {
        const occ = occByTask.get(task.id);
        // Deliberately an alarm clock, not a one-time ping: it keeps
        // nagging every sweep (every few minutes) until the task is
        // actually dealt with, so it's unmistakably different from a
        // plain "you got a new task" notification. Only two things make
        // it stop: completed/refused (done), or an active snooze whose
        // time hasn't run out yet — once that runs out, it resumes.
        const isDone = occ?.status === "completed" || occ?.status === "refused" || occ?.status === "cancelled";
        const stillSnoozing =
          occ?.status === "snoozed" && occ.snoozed_until != null && new Date(occ.snoozed_until).getTime() > Date.now();
        if (isDone || stillSnoozing) continue;

        const targetIds = task.assignee?.kind === "family" ? allMemberIds : task.assignee?.memberIds ?? [];
        if (targetIds.length === 0) continue;

        const { data: subs } = await supabase.from("push_subscriptions").select("*").in("member_id", targetIds);
        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: `⏰ Пора делать: ${task.title}`,
                body: task.description || "Отметь, что сделал(а), или перенеси время",
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

        await supabase.from("task_occurrences").upsert(
          {
            task_id: task.id,
            scheduled_for: dateISO,
            status: "pending",
            reminders_sent: (occ?.reminders_sent ?? 0) + 1,
          },
          { onConflict: "task_id,scheduled_for" },
        );
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
