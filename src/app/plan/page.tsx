"use client";

import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { TaskCard } from "@/components/TaskCard";
import { useFamilyStore } from "@/lib/store";
import { todayISO } from "@/lib/schedule";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

function timeLabel(task: Task) {
  if (task.dueTime) return `до ${task.dueTime}`;
  if (task.startTime) return `с ${task.startTime}`;
  return "сегодня";
}

const WEEKDAY = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTH = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export default function PlanPage() {
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.todaysTasks());
  const occurrences = useFamilyStore((s) => s.occurrences);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const [filter, setFilter] = useState<"all" | string>("all");

  const now = new Date();
  const key = todayISO(now);

  const involves = (task: Task, memberId: string) =>
    task.assignee.kind === "family" || task.assignee.memberIds.includes(memberId);

  const visible = filter === "all" ? tasks : tasks.filter((t) => involves(t, filter));

  const countFor = (memberId: string | "all") =>
    memberId === "all" ? tasks.length : tasks.filter((t) => involves(t, memberId)).length;

  return (
    <>
      <header className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl uppercase leading-none">Сегодня</h1>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {WEEKDAY[now.getDay()]}, {now.getDate()} {MONTH[now.getMonth()]}
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-ink bg-yellow shadow-pop-sm">
            <Icon name="calendar" className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Все {countFor("all")}
          </FilterChip>
          {members.map((m) => (
            <FilterChip key={m.id} active={filter === m.id} onClick={() => setFilter(m.id)}>
              {m.displayName} {countFor(m.id)}
            </FilterChip>
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-2.5 px-4 pb-6 pt-4">
        {visible.map((task) => {
          const status = occurrences[`${task.id}__${key}`]?.status ?? "pending";
          return (
            <Link key={task.id} href={`/tasks/${task.id}/remind`} className="block">
              <TaskCard
                icon={task.icon}
                color={task.color}
                title={task.title}
                assigneeLabel={
                  task.assignee.kind === "family"
                    ? "Всем"
                    : task.assignee.memberIds
                        .map((id) => members.find((m) => m.id === id)?.displayName ?? id)
                        .join(", ")
                }
                timeLabel={timeLabel(task)}
                points={task.points}
                completed={status === "completed"}
                surface="solid"
                onToggle={(e?: React.MouseEvent) => {
                  e?.preventDefault();
                  e?.stopPropagation();
                  if (status !== "completed") completeTask(task.id);
                }}
              />
            </Link>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
            Здесь пока пусто
          </p>
        )}
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
