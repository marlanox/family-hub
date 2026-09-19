"use client";

import { ComicButton } from "@/components/ComicButton";
import { Icon } from "@/components/Icon";
import { useFamilyStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

const REASONS = [
  "Не успеваю",
  "Не могу",
  "Плохо себя чувствую",
  "Нужно перенести",
  "Другое",
  "Без причины",
];

export default function TaskReminderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const task = useFamilyStore((s) => s.tasks.find((t) => t.id === id));
  const members = useFamilyStore((s) => s.members);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const refuseTask = useFamilyStore((s) => s.refuseTask);
  const snoozeTask = useFamilyStore((s) => s.snoozeTask);
  const [confirmingRefuse, setConfirmingRefuse] = useState(false);
  const [reason, setReason] = useState<string>("Без причины");

  if (!task) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="font-semibold text-ink/60">Задача не найдена</p>
      </main>
    );
  }

  const names =
    task.assignee.kind === "family"
      ? "Все"
      : task.assignee.memberIds
          .map((id) => members.find((m) => m.id === id)?.displayName ?? id)
          .join(", ");

  if (confirmingRefuse) {
    return (
      <main className="flex flex-1 flex-col bg-ink px-5 pb-8 pt-10 text-white">
        <p className="text-center font-display text-xl uppercase leading-tight">
          Ты точно не будешь делать?
        </p>
        <p className="mt-6 text-center text-sm font-semibold text-white/60">
          Можно указать причину (необязательно)
        </p>

        <div className="mt-5 space-y-2.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`flex w-full items-center gap-3 rounded-2xl border-3 border-white/20 px-4 py-3 text-left font-semibold ${
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
        </div>

        <div className="mt-auto space-y-3 pt-8">
          <ComicButton
            variant="pink"
            size="lg"
            className="w-full"
            onClick={() => {
              refuseTask(task.id, reason === "Без причины" ? undefined : reason);
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

  return (
    <main className="flex flex-1 flex-col items-center bg-ink px-6 pb-10 pt-14 text-center text-white">
      <div className="halftone-dots relative flex h-36 w-36 items-center justify-center rounded-full border-3 border-white/30 bg-lilac/30 text-white/20">
        <span className="spike-burst absolute inset-2 bg-yellow/90" />
        <Icon name={task.icon} className="relative z-10 h-16 w-16 text-ink" />
      </div>

      <p className="mt-8 text-sm font-bold uppercase tracking-widest text-white/50">Пора делать задачу!</p>
      <h1 className="mt-2 font-display text-3xl uppercase">{task.title}</h1>
      <p className="mt-2 font-semibold text-white/70">{names}, пора это сделать!</p>
      <span className="mt-4 rounded-full border-3 border-ink bg-mint px-4 py-1.5 font-display text-ink shadow-pop-sm">
        +{task.points} баллов
      </span>

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
