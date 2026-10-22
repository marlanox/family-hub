"use client";

import { ComicButton } from "@/components/ComicButton";
import { Facet } from "@/components/Facet";
import { Icon } from "@/components/Icon";
import { GrumpyDogArt } from "@/components/PetArt";
import { isScheduledOn, resolveAssigneeIds, todayISO } from "@/lib/schedule";
import { playSound } from "@/lib/sound";
import { useFamilyStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const REASONS = [
  "Не успеваю",
  "Не могу",
  "Плохо себя чувствую",
  "Нужно перенести",
  "Другое",
  "Без причины",
];

export default function TaskReminderPage() {
  return (
    <Suspense fallback={null}>
      <TaskReminderContent />
    </Suspense>
  );
}

function TaskReminderContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const isFreshlyAssigned = searchParams.get("reason") === "assigned";
  const router = useRouter();
  const task = useFamilyStore((s) => s.tasks.find((t) => t.id === id));
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const soundEnabled = useFamilyStore((s) => s.soundEnabled);
  const soundTheme = useFamilyStore((s) => s.soundTheme);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const refuseTask = useFamilyStore((s) => s.refuseTask);
  const snoozeTask = useFamilyStore((s) => s.snoozeTask);
  const hasHydrated = useFamilyStore((s) => s.hasHydrated);
  const familyCode = useFamilyStore((s) => s.familyCode);
  const pullSync = useFamilyStore((s) => s.pullSync);
  const [confirmingRefuse, setConfirmingRefuse] = useState(false);
  const [reason, setReason] = useState<string>("Без причины");
  const [customReason, setCustomReason] = useState("");
  // Tapping a push notification can cold-start the app straight onto
  // this screen, before the periodic RemoteSync poll has had a chance
  // to pull down a task that was only just created on someone else's
  // phone — without this, that race looked exactly like "the task
  // doesn't exist," permanently, instead of "still loading."
  const [triedSync, setTriedSync] = useState(false);
  useEffect(() => {
    if (task || triedSync || !hasHydrated || !familyCode) return;
    setTriedSync(true);
    void pullSync();
  }, [task, triedSync, hasHydrated, familyCode, pullSync]);

  useEffect(() => {
    if (confirmingRefuse) playSound("alarm", soundEnabled, soundTheme);
  }, [confirmingRefuse, soundEnabled, soundTheme]);

  // A "rotation" assignee alternates weekly, so whether this is actually
  // mine to act on can only be answered for a specific date — today,
  // since this screen is always about the current occurrence. Computed
  // from raw state rather than the `canAct`/`task` consts below, since
  // those are declared after an early return and hooks can't live past
  // one.
  const todayKey = todayISO();
  const resolvedIds = task ? resolveAssigneeIds(task.assignee, todayKey) : "family";
  const isMineToday = resolvedIds === "family" || resolvedIds.includes(whoAmI ?? "");
  // Opened from Activity (or an old notification) for a task that isn't
  // on today's schedule — e.g. a one-off for tomorrow. That's a heads-up,
  // not an alarm: show the calm "assigned" screen instead.
  const isDueToday = !!task && isScheduledOn(task, new Date(`${todayKey}T12:00:00`));
  const showAssignedView = isFreshlyAssigned || !isDueToday;

  // The due-now screen (not the "freshly assigned" one, not the refuse
  // confirmation, not someone who isn't today's assignee) keeps buzzing
  // like an actual alarm clock for as long as it's open — it only stops
  // because leaving the screen (any of the three actions, or the back
  // button) unmounts this effect.
  const isUrgentScreen = !!task && isMineToday && !showAssignedView && !confirmingRefuse;
  useEffect(() => {
    if (!isUrgentScreen) return;
    playSound("urgentAlarm", soundEnabled, soundTheme);
    const interval = setInterval(() => playSound("urgentAlarm", soundEnabled, soundTheme), 2500);
    return () => clearInterval(interval);
  }, [isUrgentScreen, soundEnabled, soundTheme]);

  if (!task) {
    // Still worth waiting for: hydration hasn't finished, or a sync
    // pull is in flight and hasn't come back yet.
    const stillLoading = !hasHydrated || (familyCode && !triedSync);
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="font-semibold text-ink/60">
          {stillLoading ? "Загружаем…" : "Задача не найдена"}
        </p>
      </main>
    );
  }

  const names =
    resolvedIds === "family"
      ? "Все"
      : resolvedIds.map((mid) => members.find((m) => m.id === mid)?.displayName ?? mid).join(", ");
  const creatorName = members.find((m) => m.id === task.creatorId)?.displayName;

  // Only whoever this occurrence is actually assigned to today can act
  // on it — someone just looking at it (or whose own device happens to
  // be open) shouldn't be able to answer for someone else, and on a
  // "rotation" task that's whoever's week it is, not the whole pool.
  const canAct = isMineToday;

  if (!canAct) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-ink px-6 py-10 text-center text-white">
        <Icon name={task.icon} className="h-16 w-16 text-white/40" />
        <h1 className="mt-4 font-display text-2xl uppercase leading-tight">{task.title}</h1>
        <p className="mt-2 font-semibold text-white/60">Эта задача не твоя — ждём, пока ответит {names}.</p>
        <ComicButton variant="outline" className="mt-8" onClick={() => router.push("/")}>
          На главную
        </ComicButton>
      </main>
    );
  }

  if (confirmingRefuse) {
    return (
      <main className="flex flex-1 flex-col bg-ink px-5 pb-8 pt-6 text-white">
        <button
          onClick={() => setConfirmingRefuse(false)}
          aria-label="Назад"
          className="mb-4 mr-auto flex h-10 w-10 items-center justify-center border-3 border-white/30 text-white"
        >
          <Icon name="back" className="h-5 w-5" />
        </button>
        <p className="text-center font-display text-xl uppercase leading-tight">
          Ты точно не будешь делать?
        </p>
        <div className="mt-2 flex flex-col items-center">
          <GrumpyDogArt className="h-44 w-44 shrink-0" />
          <Facet shape={2} shadow="none" className="-mt-2 rotate-2" fillClassName="bg-lemon px-3 py-1.5">
            <span className="font-display text-xs uppercase text-ink">Серьёзно?! Опять?!</span>
          </Facet>
        </div>
        <p className="mt-4 text-center text-sm font-semibold text-white/60">
          Можно указать причину (необязательно)
        </p>

        <div className="mt-5 space-y-2.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`flex w-full items-center gap-3 border-3 border-white/20 px-4 py-3 text-left font-semibold ${
                reason === r ? "bg-white text-ink" : "bg-white/5"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  reason === r ? "border-ink bg-pink" : "border-white/40"
                }`}
              />
              {r}
            </button>
          ))}
          {reason === "Другое" && (
            <input
              autoFocus
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Своими словами..."
              maxLength={120}
              className="w-full border-3 border-white/40 bg-white/5 px-4 py-3 font-semibold text-white outline-none placeholder:text-white/40"
            />
          )}
        </div>

        <div className="mt-auto space-y-3 pt-8">
          <ComicButton
            variant="pink"
            size="lg"
            className="w-full"
            onClick={() => {
              const finalReason =
                reason === "Без причины"
                  ? undefined
                  : reason === "Другое"
                    ? customReason.trim() || "Другое"
                    : reason;
              refuseTask(task.id, finalReason);
              router.push("/");
            }}
          >
            Подтвердить
          </ComicButton>
          <p className="text-center text-xs font-semibold text-white/50">
            Задача будет отмечена как «Не буду делать» на сегодня.
            <br />
            Уведомление получат остальные члены семьи.
          </p>
          <p className="text-center text-xs font-bold text-white/70">Всё ок, главное — честность 💛</p>
        </div>
      </main>
    );
  }

  // Two very different looks on purpose: a dark, urgent "do it right now"
  // screen for an actual due-time reminder, versus a calm, light "heads
  // up, this landed on your list" screen for a fresh assignment that
  // isn't due yet — same actions underneath, but they used to be the
  // exact same screen and that made it impossible to tell at a glance
  // which situation you were in.
  if (showAssignedView) {
    return (
      <main className="flex flex-1 flex-col items-center bg-paper px-6 pb-10 pt-6 text-center">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="mb-4 mr-auto flex h-10 w-10 items-center justify-center border-3 border-ink bg-white text-ink"
        >
          <Icon name="back" className="h-5 w-5" />
        </button>
        <Facet shape={1} fillClassName="bg-violet px-4 py-1">
          <span className="font-display text-xs uppercase text-ink">{isFreshlyAssigned ? "Новая задача для тебя" : "Задача для тебя"}</span>
        </Facet>
        <Facet kind="gem" shape={2} shadow="md" className="mt-6 h-48 w-48" fillClassName="halftone-dots flex items-center justify-center bg-violet-soft">
          <Icon name={task.icon} className="relative z-10 h-24 w-24 text-ink" />
        </Facet>

        <h1 className="mt-6 font-display text-3xl uppercase leading-tight text-ink">{task.title}</h1>
        <p className="mt-2 font-semibold text-ink/70">
          {isDueToday ? "Тебе назначили — когда время подойдёт, напомним ещё раз." : `Тебе назначили · ${scheduleLabel(task)}`}
        </p>
        {creatorName && <p className="mt-1 text-xs font-semibold text-ink/40">Назначил(а): {creatorName}</p>}
        <Facet shape={4} className="mt-4" fillClassName="bg-lime px-4 py-1.5">
          <span className="font-display text-ink">+{task.points} баллов</span>
        </Facet>

        <div className="mt-10 w-full space-y-3">
          <ComicButton variant="mint" size="lg" className="w-full" onClick={() => router.push("/")}>
            Хорошо, увидел(а)!
          </ComicButton>
          <ComicButton
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              completeTask(task.id);
              router.push("/");
            }}
          >
            ✓ Уже сделано
          </ComicButton>
          <ComicButton variant="pink" size="lg" className="w-full" onClick={() => setConfirmingRefuse(true)}>
            ✕ Не буду делать
          </ComicButton>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-ink px-6 pb-10 pt-6 text-center text-white">
      <button
        onClick={() => router.back()}
        aria-label="Назад"
        className="mb-4 mr-auto flex h-10 w-10 items-center justify-center border-3 border-white/30 text-white"
      >
        <Icon name="back" className="h-5 w-5" />
      </button>
      <div className="relative flex h-56 w-56 items-center justify-center">
        <span className="spike-burst absolute inset-0 -rotate-6 bg-lemon" />
        <Facet kind="gem" shape={3} shadow="none" className="relative h-36 w-36" fillClassName="glitter-silver flex items-center justify-center">
          <Icon name={task.icon} className="h-20 w-20 text-ink" />
        </Facet>
      </div>

      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-white/50">Пора делать задачу!</p>
      <h1 className="mt-2 font-display text-4xl uppercase leading-tight">{task.title}</h1>
      <p className="mt-2 font-semibold text-white/70">{names}, пора это сделать!</p>
      {creatorName && <p className="mt-1 text-xs font-semibold text-white/40">Назначил(а): {creatorName}</p>}
      <Facet shape={4} shadow="none" className="mt-4" fillClassName="bg-lime px-4 py-1.5">
        <span className="font-display text-ink">+{task.points} баллов</span>
      </Facet>

      <div className="mt-10 w-full space-y-3">
        <ComicButton
          variant="mint"
          size="lg"
          className="w-full"
          onClick={() => {
            completeTask(task.id);
            router.push("/");
          }}
        >
          ✓ Сделано
        </ComicButton>
        <ComicButton variant="sky" size="lg" className="w-full" onClick={() => { snoozeTask(task.id, 0.25); router.push("/"); }}>
          Через 15 минут
        </ComicButton>
        <ComicButton variant="sky" size="lg" className="w-full" onClick={() => { snoozeTask(task.id, 1); router.push("/"); }}>
          Через 1 час
        </ComicButton>
        <ComicButton variant="yellow" size="lg" className="w-full" onClick={() => { snoozeTask(task.id, 3); router.push("/"); }}>
          Через 3 часа
        </ComicButton>
        <ComicButton variant="pink" size="lg" className="w-full" onClick={() => setConfirmingRefuse(true)}>
          ✕ Не буду делать
        </ComicButton>
      </div>
    </main>
  );
}

const DOW_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function scheduleLabel(task: { recurrence: { type: string; daysOfWeek?: number[] }; onceDate?: string }): string {
  if (task.recurrence.type === "once" && task.onceDate) {
    const d = new Date(`${task.onceDate}T12:00:00`);
    return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  }
  if (task.recurrence.type === "custom_days" && task.recurrence.daysOfWeek?.length) {
    return [...task.recurrence.daysOfWeek].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DOW_SHORT[d]).join(", ");
  }
  if (task.recurrence.type === "weekdays") return "по будням";
  if (task.recurrence.type === "weekends") return "по выходным";
  return "не сегодня";
}
