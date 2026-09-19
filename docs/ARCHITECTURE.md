# Family Hub — architecture

A shared family "operating system" for tasks, routines, points and rewards.
Punk-pop scrapbook visual language, equal permissions for every member, and
zero required backend — installable and usable the moment you build it.

## Permission model

There is no admin/member split. Every family member can: add or remove
family members, create and assign tasks to anyone (or the whole family),
edit their own or anyone else's photo, complete or refuse anyone's task,
and change family settings. `FamilyMember` has no `role` field; the
Supabase RLS policies in `supabase/schema.sql` grant full read/write to
anyone who belongs to the same family — the only gate is family
membership, never a role inside it.

## Storage & sync strategy — "no server, no payment, works on Android"

This was the concrete constraint: no server to run or pay for, no iCloud
lock-in, and it has to actually persist on Android.

**Default (what ships today): local-first.** `src/lib/store.ts` is a
Zustand store persisted straight into the browser's `localStorage` via
`zustand/middleware`'s `persist`. Every action — completing a task, adding
a member, redeeming a reward — writes synchronously to the device. This
works identically on iPhone, Android and desktop the moment the PWA is
installed, entirely offline, with no account and no cost. The trade-off is
honest: data lives on *that one device*. That's enough for "install it now
and start using it," which is what was asked for.

**Optional upgrade: Supabase free tier, for cross-device sync.** If you
want Маша's phone and Ваня's phone to see the same points in real time,
something has to sit in the middle — there's no way around that for
multi-device sync, but it doesn't have to be a server *you* run or pay
for. Supabase's free tier (Postgres + Auth + Storage + Realtime + Edge
Functions) is a managed, hosted "cloud" with generous limits that comfortably
cover a family's data for the life of this project, no credit card
required. `supabase/schema.sql` has the full schema and RLS policies,
already written for the equal-permissions model above; `src/lib/supabaseClient.ts`
picks it up automatically once `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see README). Wiring the store's
actions to also write through Supabase (instead of only localStorage) is
the next increment — the schema and client are ready for it today.

**Push notifications** need the same kind of "someone has to be awake to
send them" backend, for the same reason. `public/sw.js` has the
`push`/`notificationclick` handlers ready; the missing piece is a
scheduler that calls the Web Push API at the right time, which is a
natural fit for a Supabase Edge Function + `pg_cron` (also free tier) —
not implemented yet, called out here so it isn't mistaken for an
oversight. Until then, reminders are in-app only (visiting `/` or the
`/tasks/[id]/remind` screen while a task is due).

## Task occurrence state machine

A recurring task doesn't have one status — each **calendar day** it's
scheduled gets its own occurrence, keyed by `${taskId}__${dateISO}`
(`src/lib/schedule.ts`). Refusing or completing today never touches
tomorrow's occurrence.

```
              ┌─────────┐
   (created)  │ pending │
   ──────────▶│         │
              └────┬────┘
       ┌───────────┼─────────────┬───────────────┐
       ▼           ▼             ▼                ▼
  ┌─────────┐ ┌──────────┐ ┌───────────┐   (deadline passes,
  │completed│ │ snoozed  │ │  refused  │    no action taken)
  └─────────┘ └────┬─────┘ └───────────┘        │
                    │                             ▼
                    └──────────▶ pending ◀──  ┌────────┐
                     (snooze expires)          │ missed │
                                                └────────┘
```

- `pending → completed`: awards points to every assignee, bumps streak,
  lifetime points, completed-task count; evaluates badges/milestones.
- `pending → refused`: optional reason, no points, no further reminders
  for *this* occurrence; future occurrences unaffected.
- `pending → snoozed → pending`: `snoozedUntil` set, `remindersSent`
  incremented; the task simply becomes due again.
- `pending → missed`: only for tasks with `hasDeadline: true`, once the
  due time passes with no interaction (see Notification state machine).
  Flexible tasks (no deadline) stay open until end of day instead.

## Notification state machine (in-app today, push-ready)

```
scheduled time reached
        │
        ▼
 ┌─────────────┐   ignored ~60m    ┌──────────────┐  ignored ~180m   ┌────────────┐
 │ reminder #1 │ ────────────────▶ │ reminder #2  │ ───────────────▶ │ reminder #3│
 └─────┬───────┘                   └──────┬───────┘                  └─────┬──────┘
       │ Сделано / Через 1ч / Через 3ч / Не буду делать (any of these stop it)
       ▼                                                                    │
   occurrence updated, loop ends                          no interaction ──▶│
                                                                             ▼
                                                                  mark MISSED (if hasDeadline)
```

`maxAutoReminders` (default 3) and the follow-up delays (default 60/180
minutes) live in `Family.notificationRules` — configurable per family, and
the loop always terminates. No occurrence ever gets more than the
configured number of automatic nudges.

## Screen map

| Route | Screen |
|---|---|
| `/` | НАША СЕМЬЯ — home: member stickers, family goal, today's tasks |
| `/plan` | СЕГОДНЯ — day view with per-member filter chips |
| `/tasks/new` | ДОБАВИТЬ ЗАДАЧУ — templates grid or custom form (one-off or recurring) |
| `/tasks/[id]/remind` | Reminder action sheet (Сделано / +1ч / +3ч / Не буду делать) → refusal reason |
| `/activity` | Family activity feed |
| `/rewards` | РЕЙТИНГ — leaderboard + family goal + reward list + recent achievements |
| `/profile` | Per-member profile: photo, stats, my tasks, achievements |
| `/settings` | Manage family members, sound toggle, storage/sync info |

## Design system

Extracted from the supplied reference screens (not guessed): warm paper
background + halftone/grain texture, thick black comic outlines on every
sticker/button/card, hard offset drop-shadows (`shadow-pop*` in
`tailwind.config.ts`) instead of blurred ones, acid palette (hot pink,
acid yellow, lilac, sky blue, mint, coral) never washed-out pastel, and
two Cyrillic-capable fonts: **Unbounded** (800/900 weight, blocky display
headers, always uppercase) and **Inter** (UI/body text). Photos sit in
irregular "blob" sticker shapes (`.blob-shape`) with a colored ring per
person, never a plain circle. Page titles either sit in a rounded "torn
paper" banner (`HeaderBanner`) or a spiky comic burst (`BurstTitle`),
matching which reference screen they came from. Reusable components live
in `src/components/`: `ComicButton`, `Sticker`, `PointsBadge`, `TaskCard`,
`FamilyMemberSticker`, `GoalProgress`, `SectionTitle`, `BottomNav`,
`BadgeChip`, `LeaderboardRow`, `IconPicker`, `ColorPicker`,
`DifficultySelector`, `BurstTitle`, `HeaderBanner`, `CelebrationToast`.

No copyrighted characters (the references used Family Guy art for the
reminder mascot) — those screens use an original halftone/comic-burst
treatment instead.

## Folder structure

```
src/
  app/                 Next.js App Router pages (one folder per route)
  components/          Reusable design-system components
  lib/
    types.ts            Domain types (Task, FamilyMember, Reward, …)
    store.ts             Zustand store — the local-first source of truth
    schedule.ts          Recurrence → "is this task due today" logic
    sound.ts              Synthesized celebration sounds (Web Audio API)
    demoData.ts            Seed family (Маша/Наташа/Ваня) + demo tasks
    taskTemplates.ts         Quick-create templates
    supabaseClient.ts          Optional sync client (inert until configured)
public/
  manifest.webmanifest   PWA manifest
  sw.js                    Service worker (offline shell + push skeleton)
  icons/                    App icons (192/512, maskable)
supabase/
  schema.sql             Optional cross-device sync schema + RLS
docs/
  ARCHITECTURE.md        This file
```

## Implementation order (what actually happened)

1. Design tokens + Tailwind config from the reference screenshots.
2. Core reusable components (buttons, cards, stickers, nav).
3. Home screen ("НАША СЕМЬЯ") — the flagship, built and reviewed first.
4. Local-first store wired to real actions (nothing above was a mockup
   for long — task completion, points, streaks all work from early on).
5. Remaining screens: Plan, Create Task, Reminder/refusal, Activity,
   Rewards/Leaderboard, Profile, Settings — all sharing step 1–2's system.
6. Sounds + celebration animation + milestone rewards every +1000 points.
7. PWA installability: real rendered icons, manifest, service worker.
8. Optional Supabase schema for the cross-device upgrade path.

## Known limitations (stated plainly, not glossed over)

- **Single device by default.** Cross-device sync needs the optional
  Supabase step above; nothing is silently fake in the meantime — it's
  just scoped to one phone until you opt in.
- **No background push yet.** Reminders work while the app is open; a
  real "phone buzzes even when the app is closed" experience needs the
  Edge Function scheduler described above. This is a genuine PWA/OS
  limitation to plan around, not something to paper over (see the
  original brief's own §44 — a PWA cannot force alarms the way a native
  OS clock app can).
- **Simplified recurrence:** `times_per_week` / `times_per_day` currently
  behave like "daily" (offered every day) rather than tracking a weekly
  quota; the data model already has the fields to finish this later.
