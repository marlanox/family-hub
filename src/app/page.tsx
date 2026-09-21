"use client";

import { BadgeChip } from "@/components/BadgeChip";
import { BottomNav } from "@/components/BottomNav";
import { FamilyMemberSticker } from "@/components/FamilyMemberSticker";
import { GoalProgress } from "@/components/GoalProgress";
import { HeaderBanner } from "@/components/HeaderBanner";
import { Icon } from "@/components/Icon";
import { SectionTitle } from "@/components/SectionTitle";
import { TaskCard } from "@/components/TaskCard";
import { occurrenceKey, todayISO } from "@/lib/schedule";
import { useFamilyStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { useMemo } from "react";

function timeLabel(task: Task) {
  if (task.dueTime) return `до ${task.dueTime}`;
  if (task.startTime) return `с ${task.startTime}`;
  return "сегодня";
}

export default function HomePage() {
  const members = useFamilyStore((s) => s.members);
  const todaysTasks = useFamilyStore((s) => s.todaysTasks());
  const occurrences = useFamilyStore((s) => s.occurrences);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const familyPoints = useFamilyStore((s) => s.familyPoints);
  const rewardName = useFamilyStore((s) => s.currentFamilyRewardName());

  const topMember = useMemo(
    () => [...members].sort((a, b) => b.points - a.points)[0]?.id,
    [members],
  );

  const assigneeLabel = (task: Task) => {
    if (task.assignee.kind === "family") return "Всем";
    return task.assignee.memberIds
      .map((id) => members.find((m) => m.id === id)?.displayName ?? id)
      .join(", ");
  };

  const todayKey = todayISO();
  const pendingCount = todaysTasks.filter(
    (t) => (occurrences[occurrenceKey(t.id, todayKey)]?.status ?? "pending") !== "completed",
  ).length;

  return (
    <>
      <header>
        <HeaderBanner
          title="Наша семья"
          tag="Вместе лучше 🙂"
          color="pink"
          action={
            <Link
              href="/settings"
              aria-label="Настройки семьи"
              className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-ink bg-white shadow-pop-sm"
            >
              <Icon name="settings" className="h-5 w-5" />
            </Link>
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
          {todaysTasks.map((task) => {
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
                  onToggle={(e?: React.MouseEvent) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    if (status !== "completed") completeTask(task.id);
                  }}
                />
              </Link>
            );
          })}
          {todaysTasks.length === 0 && (
            <p className="rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
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
