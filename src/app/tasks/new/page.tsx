"use client";

import { BurstTitle } from "@/components/BurstTitle";
import { ComicButton } from "@/components/ComicButton";
import { DifficultySelector } from "@/components/DifficultySelector";
import { Icon } from "@/components/Icon";
import { IconPicker } from "@/components/IconPicker";
import { useFamilyStore } from "@/lib/store";
import { taskTemplates, type TaskTemplate } from "@/lib/taskTemplates";
import { accentMap } from "@/lib/colors";
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
  { value: "custom_days", label: "По дням недели" },
  { value: "times_per_week", label: "Несколько раз в неделю" },
];

const DOW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function NewTaskPage() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.members);
  const addTask = useFamilyStore((s) => s.addTask);

  const [step, setStep] = useState<Step>("pick");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<IconKey>("checklist");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("pink");
  const [points, setPoints] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assignFamily, setAssignFamily] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dueTime, setDueTime] = useState("12:00");
  const [onceDate, setOnceDate] = useState(todayISO());
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setAssignFamily(false);
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    if (!title.trim()) {
      setError("Дайте задаче название");
      return;
    }
    if (!assignFamily && assigneeIds.length === 0) {
      setError("Выберите, кому назначить задачу");
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
      points,
      difficulty,
      assignee: assignFamily ? { kind: "family" } : { kind: "member", memberIds: assigneeIds },
      creatorId: (assignFamily ? members[0]?.id : assigneeIds[0]) ?? members[0]?.id ?? "",
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
            <button onClick={() => router.push("/")} aria-label="Закрыть" className="rounded-full border-3 border-ink bg-white p-2 shadow-pop-sm">
              <Icon name="close" className="h-5 w-5" />
            </button>
            <span className="w-9" />
          </div>
          <BurstTitle color="yellow">ДОБАВИТЬ ЗАДАЧУ</BurstTitle>
        </header>

        <main className="flex-1 space-y-4 px-4 pb-8 pt-4">
          <div className="flex rounded-full border-3 border-ink bg-white p-1 shadow-pop-sm">
            <span className="flex-1 rounded-full bg-pink py-2 text-center font-display text-xs uppercase text-white">
              Шаблоны
            </span>
            <button
              onClick={startCustom}
              className="flex-1 rounded-full py-2 text-center font-display text-xs uppercase text-ink"
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
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border-3 border-ink",
                    accentMap[t.color].bg,
                  )}
                >
                  <Icon name={t.icon} className="h-5 w-5" />
                </span>
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
        <button onClick={() => setStep("pick")} aria-label="Назад" className="rounded-full border-3 border-ink bg-white p-2 shadow-pop-sm">
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
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={cn(
                  "rounded-full border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                  !assignFamily && assigneeIds.includes(m.id) ? "bg-sky" : "bg-white",
                )}
              >
                {m.displayName}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAssignFamily(true);
                setAssigneeIds([]);
              }}
              className={cn(
                "rounded-full border-3 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-pop-sm",
                assignFamily ? "bg-sky" : "bg-white",
              )}
            >
              Всем
            </button>
          </div>
        </Field>

        <Field label="Когда?">
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
            className="w-full rounded-xl border-3 border-ink bg-white px-3 py-2.5 font-semibold outline-none"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {recurrence === "custom_days" && (
          <div className="flex flex-wrap gap-2">
            {DOW.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "h-9 w-9 rounded-full border-3 border-ink font-display text-xs shadow-pop-sm",
                  daysOfWeek.includes(i) ? "bg-pink text-white" : "bg-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
              onClick={() => setPoints((p) => Math.max(5, p - 5))}
              className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-ink bg-white font-display text-lg shadow-pop-sm"
            >
              −
            </button>
            <span className="w-16 text-center font-display text-2xl">{points}</span>
            <button
              type="button"
              onClick={() => setPoints((p) => p + 5)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-ink bg-white font-display text-lg shadow-pop-sm"
            >
              +
            </button>
          </div>
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
