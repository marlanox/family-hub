"use client";

import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { TaskCard } from "@/components/TaskCard";
import { isScheduledOn, todayISO } from "@/lib/schedule";
import { useFamilyStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function timeLabel(task: Task) {
  if (task.dueTime) return `до ${task.dueTime}`;
  if (task.startTime) return `с ${task.startTime}`;
  return "в течение дня";
}

export default function CalendarPage() {
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const occurrences = useFamilyStore((s) => s.occurrences);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [openDay, setOpenDay] = useState<string | null>(todayISO());

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const involves = (task: Task, memberId: string) =>
    task.assignee.kind === "family" || task.assignee.memberIds.includes(memberId);

  const assigneeLabel = (task: Task) => {
    if (task.assignee.kind === "family") return "Всем";
    return task.assignee.memberIds
      .map((id) => members.find((m) => m.id === id)?.displayName ?? id)
      .join(", ");
  };

  return (
    <>
      <header className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Предыдущая неделя"
            className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-ink bg-white shadow-pop-sm"
          >
            <Icon name="back" className="h-4 w-4" />
          </button>
          <h1 className="font-display text-lg uppercase">
            {weekOffset === 0 ? "Эта неделя" : weekOffset > 0 ? `Через ${weekOffset} нед.` : `${-weekOffset} нед. назад`}
          </h1>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Следующая неделя"
            className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-ink bg-white shadow-pop-sm"
          >
            <Icon name="back" className="h-4 w-4 rotate-180" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Все
          </FilterChip>
          {members.map((m) => (
            <FilterChip key={m.id} active={filter === m.id} onClick={() => setFilter(m.id)}>
              {m.displayName}
            </FilterChip>
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-2.5 px-4 pb-6 pt-4">
        {days.map((date) => {
          const dateISO = todayISO(date);
          const dayTasks = tasks.filter(
            (t) => isScheduledOn(t, date) && (filter === "all" || involves(t, filter)),
          );
          const isToday = dateISO === todayISO();
          const isOpen = openDay === dateISO;

          return (
            <div key={dateISO} className="overflow-hidden rounded-2xl border-3 border-ink bg-white shadow-pop-sm">
              <button
                onClick={() => setOpenDay(isOpen ? null : dateISO)}
                className={`flex w-full items-center gap-3 p-3 text-left ${isToday ? "bg-pink-soft" : ""}`}
              >
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-ink bg-paper font-display leading-none">
                  <span className="text-[9px] uppercase">{MONTH_SHORT[date.getMonth()]}</span>
                  <span className="text-base">{date.getDate()}</span>
                </span>
                <span className="flex-1 font-display text-sm uppercase">
                  {WEEKDAY_SHORT[date.getDay()]}
                  {isToday && <span className="ml-2 text-[10px] text-pink-deep">СЕГОДНЯ</span>}
                </span>
                <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold">
                  {dayTasks.length}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-2 border-t-3 border-ink p-3">
                  {dayTasks.map((task) => {
                    const status = occurrences[`${task.id}__${dateISO}`]?.status ?? "pending";
                    return (
                      <Link key={task.id} href={`/tasks/remind?id=${task.id}`} className="block">
                        <TaskCard
                          icon={task.icon}
                          color={task.color}
                          title={task.title}
                          assigneeLabel={assigneeLabel(task)}
                          timeLabel={timeLabel(task)}
                          points={task.points}
                          completed={status === "completed"}
                          onToggle={(e?: React.MouseEvent) => {
                            e?.preventDefault();
                            e?.stopPropagation();
                            if (status !== "completed") completeTask(task.id, dateISO);
                          }}
                        />
                      </Link>
                    );
                  })}
                  {dayTasks.length === 0 && (
                    <p className="p-2 text-center text-xs font-semibold text-ink/40">Ничего не запланировано</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>

      <BottomNav />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border-3 border-ink px-3.5 py-1.5 font-display text-xs uppercase shadow-pop-sm ${
        active ? "bg-ink text-white" : "bg-white text-ink"
      }`}
    >
      {children}
    </button>
  );
}
