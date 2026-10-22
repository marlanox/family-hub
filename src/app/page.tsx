"use client";

import { BadgeChip } from "@/components/BadgeChip";
import { BottomNav } from "@/components/BottomNav";
import { Facet } from "@/components/Facet";
import { FamilyMemberSticker } from "@/components/FamilyMemberSticker";
import { GoalProgress } from "@/components/GoalProgress";
import { HeaderBanner } from "@/components/HeaderBanner";
import { Icon } from "@/components/Icon";
import { SectionTitle } from "@/components/SectionTitle";
import { TaskCard } from "@/components/TaskCard";
import { isMineOn, occurrenceKey, resolveAssigneeIds, todayISO } from "@/lib/schedule";
import { useFamilyStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { useMemo } from "react";

function timeLabel(task: Task) {
  if (task.dueTime) return `до ${task.dueTime}`;
  if (task.startTime) return `с ${task.startTime}`;
  return "сегодня";
}

const DOW_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function upcomingLabel(task: Task) {
  if (task.recurrence.type === "once" && task.onceDate) {
    return new Date(`${task.onceDate}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
  }
  if (task.recurrence.type === "custom_days" && task.recurrence.daysOfWeek?.length) {
    return task.recurrence.daysOfWeek.map((d) => DOW_SHORT[d]).join(", ");
  }
  return "не сегодня";
}

export default function HomePage() {
  const members = useFamilyStore((s) => s.members);
  const todaysTasks = useFamilyStore((s) => s.todaysTasks());
  const allTasks = useFamilyStore((s) => s.tasks);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const occurrences = useFamilyStore((s) => s.occurrences);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const familyPoints = useFamilyStore((s) => s.familyPoints);
  const rewardName = useFamilyStore((s) => s.currentFamilyRewardName());

  const topMember = useMemo(
    () => [...members].sort((a, b) => b.points - a.points)[0]?.id,
    [members],
  );

  const todayKey = todayISO();
  const assigneeLabel = (task: Task) => {
    const ids = resolveAssigneeIds(task.assignee, todayKey);
    if (ids === "family") return "Всем";
    return ids.map((id) => members.find((m) => m.id === id)?.displayName ?? id).join(", ");
  };

  // Someone assigned me a task that isn't due today (a one-off for later
  // this week, or days that skip today): it used to be invisible here,
  // so tapping its "new task" push landed on a Home without it.
  const assignedToMe = useMemo(() => {
    if (!whoAmI) return [];
    const todayIds = new Set(todaysTasks.map((t) => t.id));
    const weekAgo = Date.now() - 3 * 86400000;
    return allTasks.filter((t) => {
      if (todayIds.has(t.id) || t.assignee.kind === "family") return false;
      if (!t.assignee.memberIds.includes(whoAmI)) return false;
      if (t.recurrence.type === "once") return !!t.onceDate && t.onceDate > todayKey;
      return t.creatorId !== whoAmI && new Date(t.createdAt).getTime() > weekAgo;
    });
  }, [allTasks, todaysTasks, whoAmI, todayKey]);

  // Still-to-do first (soonest deadline on top), done ones sink down.
  const sortedToday = useMemo(() => {
    const done = (t: Task) => (occurrences[occurrenceKey(t.id, todayKey)]?.status ?? "pending") === "completed";
    const time = (t: Task) => t.dueTime ?? t.startTime ?? "99:99";
    return [...todaysTasks].sort((a, b) => Number(done(a)) - Number(done(b)) || time(a).localeCompare(time(b)));
  }, [todaysTasks, occurrences, todayKey]);

  const pendingCount = todaysTasks.filter(
    (t) => (occurrences[occurrenceKey(t.id, todayKey)]?.status ?? "pending") !== "completed",
  ).length;

  return (
    <>
      <header>
        <HeaderBanner
          title="Кто главный панкрокер?"
          action={
            <div className="flex shrink-0 items-start gap-2">
              <Link href="/guides" aria-label="Инструкции" className="flex flex-col items-center gap-1">
                <Facet
                  kind="gem"
                  shape={1}
                  className="h-16 w-16"
                  fillClassName="flex items-center justify-center"
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "conic-gradient(from 20deg, #ff6b6b, #ffd23d, #e6ff00, #4ce0a0, #4fc1ff, #9b7bff, #ff6b6b)",
                    }}
                  />
                  <span className="relative flex h-9 w-9 items-center justify-center border-2 border-ink bg-white">
                    <Icon name="checklist" className="h-6 w-6" />
                  </span>
                </Facet>
                <span className="border-2 border-ink bg-white px-1.5 text-[9px] font-bold uppercase leading-4">Инструкции</span>
              </Link>
              <Link href="/settings" aria-label="Настройки семьи" className="mt-1">
                <Facet kind="gem" shape={3} className="h-12 w-12" fillClassName="glitter-silver flex items-center justify-center">
                  <Icon name="settings" className="h-7 w-7" />
                </Facet>
              </Link>
            </div>
          }
        />
      </header>

      <main className="flex-1 space-y-5 px-4 pb-6 pt-6">
        <div className="flex justify-around">
          {members.map((member) => (
            <Link key={member.id} href={`/profile?member=${member.id}`}>
              <FamilyMemberSticker member={member} crown={member.id === topMember} editHint />
            </Link>
          ))}
        </div>
        <p className="-mt-3 text-center text-[11px] font-bold text-ink/40">
          Нажмите на себя, чтобы добавить фото ✏️
        </p>

        {assignedToMe.length > 0 && (
          <>
            <SectionTitle>Назначено тебе</SectionTitle>
            <div className="space-y-2.5">
              {assignedToMe.map((task) => (
                <Link key={task.id} href={`/tasks/remind?id=${task.id}&reason=assigned`} className="block">
                  <TaskCard
                    icon={task.icon}
                    color={task.color}
                    title={task.title}
                    assigneeLabel={`от ${members.find((m) => m.id === task.creatorId)?.displayName ?? "семьи"}`}
                    timeLabel={upcomingLabel(task)}
                    points={task.points}
                    completed={false}
                  />
                </Link>
              ))}
            </div>
          </>
        )}

        <GoalProgress
          title="Семейная цель"
          subtitle={`5000 баллов = ${rewardName}`}
          current={familyPoints}
          target={5000}
        />

        <SectionTitle
          action={
            <Link
              href="/plan"
              className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase text-ink/60"
            >
              Все
              <span aria-hidden>→</span>
            </Link>
          }
        >
          Сегодня
          <span className="ml-2 align-middle text-sm text-ink/40">{pendingCount} задач</span>
        </SectionTitle>

        <div className="space-y-2.5">
          {sortedToday.map((task) => {
            const key = occurrenceKey(task.id, todayKey);
            const status = occurrences[key]?.status ?? "pending";
            if (status === "refused") return null;
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
                  onToggle={
                    isMineOn(task, whoAmI, todayKey)
                      ? (e?: React.MouseEvent) => {
                          e?.preventDefault();
                          e?.stopPropagation();
                          if (status !== "completed") completeTask(task.id);
                        }
                      : undefined
                  }
                />
              </Link>
            );
          })}
          {todaysTasks.length === 0 && (
            <p className="border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
              На сегодня задач нет — самое время добавить одну!
            </p>
          )}
        </div>

        <div className="flex gap-2.5">
          <BadgeChip emoji="🔥" value={Math.max(...members.map((m) => m.currentStreak), 0)} label="дней подряд" />
          <BadgeChip
            emoji="🏆"
            value={members.reduce((s, m) => s + m.completedTaskCount, 0)}
            label="задач выполнено"
          />
          <BadgeChip emoji="⭐" value={members.length} label="человек в команде" />
        </div>
      </main>

      <BottomNav />
    </>
  );
}
