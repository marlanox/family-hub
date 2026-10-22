"use client";

import { BurstTitle } from "@/components/BurstTitle";
import { ComicButton } from "@/components/ComicButton";
import { DifficultySelector } from "@/components/DifficultySelector";
import { Icon } from "@/components/Icon";
import { IconPicker } from "@/components/IconPicker";
import { CatArt } from "@/components/PetArt";
import { useFamilyStore } from "@/lib/store";
import { taskTemplates, type TaskTemplate } from "@/lib/taskTemplates";
import { TaskTileIcon } from "@/components/TaskCard";
import { todayISO } from "@/lib/schedule";
import type { Difficulty, FamilyMember, IconKey, RecurrenceType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "pick" | "form";

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "once", label: "Разово" },
  { value: "daily", label: "Каждый день" },
  { value: "weekdays", label: "По будням" },
  { value: "weekends", label: "По выходным" },
  { value: "custom_days", label: "Выбрать дни ✓" },
  { value: "times_per_week", label: "Несколько раз в неделю" },
];

const DOW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function NewTaskPage() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const addTask = useFamilyStore((s) => s.addTask);

  const [step, setStep] = useState<Step>("pick");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<IconKey>("checklist");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("pink");
  const [points, setPoints] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  // Defaults to the whole family so a first-time "Создать задачу" tap
  // with no extra interaction actually creates the task — previously
  // neither was picked, submit() silently refused with an inline error,
  // and nothing else happened (no sound, no navigating back), which
  // looked exactly like the button doing nothing.
  const [assignMode, setAssignMode] = useState<"family" | "fixed" | "rotation">("family");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dueTime, setDueTime] = useState("12:00");
  const [onceDate, setOnceDate] = useState(todayISO());
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A standing house rule: Наташа isn't allowed to lowball Машу on
  // points — 50 is the floor whenever she's the one creating the task
  // and Маша is among who it goes to (including a whole-family task).
  // Derived rather than clamped into state, so it can't be silently
  // undone by something else resetting `points` afterwards (a template
  // pick, "Своя задача", the difficulty selector, …).
  const creatorName = members.find((m) => m.id === whoAmI)?.displayName.trim().toLowerCase();
  const targetsMasha =
    assignMode === "family" ||
    assigneeIds.some((id) => members.find((m) => m.id === id)?.displayName.trim().toLowerCase() === "маша");
  const minPoints = creatorName === "наташа" && targetsMasha ? 50 : 5;
  const effectivePoints = Math.max(minPoints, points);

  function applyTemplate(t: TaskTemplate) {
    setTitle(t.title);
    setIcon(t.icon);
    setColor(t.color);
    setPoints(t.points);
    setDifficulty(t.difficulty);
    setStep("form");
  }

  function startCustom() {
    setTitle("");
    setIcon("checklist");
    setColor("pink");
    setPoints(20);
    setDifficulty("easy");
    setStep("form");
  }

  function toggleDay(d: number) {
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    if (!title.trim()) {
      setError("Дайте задаче название");
      return;
    }
    if (assignMode !== "family" && assigneeIds.length === 0) {
      setError("Выберите, кому назначить задачу");
      return;
    }
    if (assignMode === "rotation" && assigneeIds.length < 2) {
      setError("Для «по очереди» выберите минимум двух человек");
      return;
    }
    if (recurrence === "custom_days" && daysOfWeek.length === 0) {
      setError("Выберите хотя бы один день недели");
      return;
    }

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      category: "custom",
      icon,
      color,
      points: effectivePoints,
      difficulty,
      assignee:
        assignMode === "family"
          ? { kind: "family" }
          : assignMode === "rotation"
            ? { kind: "rotation", memberIds: assigneeIds }
            : { kind: "member", memberIds: assigneeIds },
      // Who actually created the task, not who it's assigned to — those
      // used to be conflated, so "Маша назначила Ване" showed up in
      // Activity as "Ваня назначил(а) Ване".
      creatorId: whoAmI ?? members[0]?.id ?? "",
      recurrence: { type: recurrence, daysOfWeek: recurrence === "custom_days" ? daysOfWeek : undefined },
      dueTime: recurrence !== "once" || dueTime ? dueTime : undefined,
      onceDate: recurrence === "once" ? onceDate : undefined,
      hasDeadline: Boolean(dueTime),
      reminderEnabled,
    });

    router.push("/");
  }

  if (step === "pick") {
    return (
      <>
        <header className="flex flex-col items-center gap-3 px-4 pt-6">
          <div className="flex w-full items-center justify-between">
            <button onClick={() => router.back()} aria-label="Закрыть" className="border-3 border-ink bg-white p-2 shadow-pop-sm">
              <Icon name="close" className="h-5 w-5" />
            </button>
            <span className="w-9" />
          </div>
          <BurstTitle color="yellow">ДОБАВИТЬ ЗАДАЧУ</BurstTitle>
        </header>

        <main className="flex-1 space-y-4 px-4 pb-8 pt-4">
          <div className="flex items-center justify-center gap-3">
            <div className="relative flex shrink-0 flex-col items-center">
              <Bat className="absolute -left-3 top-1 h-5 w-8 -rotate-12" />
              <Bat className="absolute -right-2 -top-1 h-4 w-6 rotate-12" />
              <Bat className="absolute left-6 -top-3 h-3 w-5 rotate-6" />
              <Bat className="absolute -right-4 top-14 h-3.5 w-5 -rotate-6" />
              <CatArt className="h-32 w-32 rotate-2" />
              <span className="-mt-1 border-3 border-ink bg-white px-2.5 py-0.5 text-center font-display text-[10px] uppercase leading-tight shadow-pop-sm">
                Макака
                <br />
                <span className="text-[8px] normal-case text-ink/50">сиамский кот</span>
              </span>
            </div>
            <span className="rounded-2xl border-3 border-ink bg-white px-3 py-1.5 font-display text-xs shadow-pop-sm rotate-2">
              Заставляй других пахать,
              <br />
              а сам отдыхай
            </span>
          </div>

          <div className="flex border-3 border-ink bg-white p-1 shadow-pop-sm">
            <span className="flex-1 bg-pink py-2 text-center font-display text-xs uppercase text-white">
              Шаблоны
            </span>
            <button
              onClick={startCustom}
              className="flex-1 py-2 text-center font-display text-xs uppercase text-ink"
            >
              Своя задача
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {taskTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm"
              >
                <TaskTileIcon icon={t.icon} color={t.color} />
                <span className="text-center text-[11px] font-bold leading-tight">{t.title}</span>
              </button>
            ))}
            <button
              onClick={startCustom}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-3 border-dashed border-ink/40 bg-white/50 p-3"
            >
              <Icon name="plus" className="h-6 w-6" />
              <span className="text-center text-[11px] font-bold leading-tight">Другое</span>
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-6">
        <button onClick={() => setStep("pick")} aria-label="Назад" className="border-3 border-ink bg-white p-2 shadow-pop-sm">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl uppercase">Новая задача</h1>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-8 pt-4">
        <Field label="Название задачи">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: помыть машину"
            className="w-full rounded-xl border-3 border-ink px-3 py-2.5 font-semibold outline-none"
          />
        </Field>

        <Field label="Описание (необязательно)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-3 border-ink px-3 py-2.5 font-semibold outline-none"
          />
        </Field>

        <Field label="Иконка">
          <IconPicker value={icon} onChange={setIcon} />
        </Field>

        <Field label="Кому назначить?">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setAssignMode("family");
                setAssigneeIds([]);
              }}
              className={cn(
                "border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                assignMode === "family" ? "bg-violet" : "bg-white",
              )}
            >
              Всем
            </button>
            <button
              type="button"
              onClick={() => setAssignMode("fixed")}
              className={cn(
                "border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                assignMode === "fixed" ? "bg-violet" : "bg-white",
              )}
            >
              Конкретным
            </button>
            <button
              type="button"
              onClick={() => setAssignMode("rotation")}
              className={cn(
                "border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                assignMode === "rotation" ? "bg-violet" : "bg-white",
              )}
            >
              По очереди
            </button>
          </div>

          {assignMode !== "family" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(m.id)}
                  className={cn(
                    "border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                    assigneeIds.includes(m.id) ? "bg-violet" : "bg-white",
                  )}
                >
                  {m.displayName}
                </button>
              ))}
            </div>
          )}
          {assignMode === "rotation" && (
            <p className="mt-2 px-1 text-xs font-semibold text-ink/50">
              Каждую неделю задача будет доставаться по очереди одному из выбранных.
            </p>
          )}
        </Field>

        <Field label="Когда?">
          <div className="grid grid-cols-2 gap-2">
            {RECURRENCE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={recurrence === o.value}
                onClick={() => setRecurrence(o.value)}
                className={cn(
                  "rounded-xl border-3 border-ink py-2.5 text-center font-display text-[11px] uppercase shadow-pop-sm",
                  recurrence === o.value ? "bg-violet" : "bg-white",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        {recurrence === "custom_days" && (
          <Field label="Какие дни?">
            <div className="flex flex-wrap gap-2">
              {DOW.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={daysOfWeek.includes(i)}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "h-10 w-10 border-3 border-ink font-display text-xs shadow-pop-sm",
                    daysOfWeek.includes(i) ? "bg-pink text-white" : "bg-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {recurrence === "once" && (
          <Field label="Дата">
            <input
              type="date"
              value={onceDate}
              onChange={(e) => setOnceDate(e.target.value)}
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 font-semibold outline-none"
            />
          </Field>
        )}

        <Field label="Время (необязательно)">
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full rounded-xl border-3 border-ink px-3 py-2.5 font-semibold outline-none"
          />
        </Field>

        <Field label="Сложность">
          <DifficultySelector
            value={difficulty}
            onChange={(d, suggested) => {
              setDifficulty(d);
              setPoints(suggested);
            }}
          />
        </Field>

        <Field label="Сколько баллов?">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPoints((p) => Math.max(minPoints, p - 5))}
              className="flex h-10 w-10 items-center justify-center border-3 border-ink bg-white font-display text-lg shadow-pop-sm"
            >
              −
            </button>
            <span className="w-16 text-center font-display text-2xl">{effectivePoints}</span>
            <button
              type="button"
              onClick={() => setPoints(effectivePoints + 5)}
              className="flex h-10 w-10 items-center justify-center border-3 border-ink bg-white font-display text-lg shadow-pop-sm"
            >
              +
            </button>
          </div>
          {minPoints === 50 && (
            <p className="mt-2 text-xs font-bold text-ink/50">
              Для Маши у тебя минимум 50 баллов — правило семьи 😏
            </p>
          )}
          {effectivePoints <= 10 && (
            <p className="mt-2 text-sm font-bold text-pink">
              Скажи, неужели ты хочешь обделить своего родственника?! Гони больше баллов, абьюзер!!!!!
            </p>
          )}
        </Field>

        <label className="flex items-center gap-2 rounded-xl border-3 border-ink bg-white px-3 py-2.5 shadow-pop-sm">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-5 w-5 accent-pink"
          />
          <span className="font-semibold">Включить напоминания</span>
        </label>

        {error && <p className="font-bold text-pink-deep">{error}</p>}

        <ComicButton variant="mint" size="lg" className="w-full" onClick={submit}>
          Создать задачу
        </ComicButton>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-ink/60">{label}</p>
      {children}
    </div>
  );
}

// Tiny flying bat that flutters around Макака in her Batman cape.
function Bat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={`bat-flap ${className ?? ""}`} aria-hidden>
      <path
        d="M20 6c1-2 2-3 2-4 1 1 1 2 1 3 4-3 9-4 17-2-3 2-4 5-4 8-3-2-6-2-8 1-2-1-4 0-5 2-1-1-2-1-3-1s-2 0-3 1c-1-2-3-3-5-2-2-3-5-3-8-1 0-3-1-6-4-8 8-2 13-1 17 2 0-1 0-2 1-3 0 1 1 2 2 4Z"
        fill="#151313"
      />
    </svg>
  );
}
