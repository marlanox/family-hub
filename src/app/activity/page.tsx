"use client";

import { BottomNav } from "@/components/BottomNav";
import { Facet, shapeFor } from "@/components/Facet";
import { Icon } from "@/components/Icon";
import { useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import type { ActivityEventType, IconKey } from "@/lib/types";
import Link from "next/link";

const ICONS: Record<ActivityEventType, IconKey> = {
  task_assigned: "plus",
  task_completed: "checklist",
  task_refused: "close",
  task_postponed: "clock",
  task_missed: "clock",
  points_awarded: "star",
  badge_earned: "star",
  reward_unlocked: "gift",
  member_joined: "family",
  guide_updated: "checklist",
};

const TONES: Record<ActivityEventType, string> = {
  task_assigned: "bg-lilac-soft",
  task_completed: "bg-lime",
  task_refused: "bg-pink-soft",
  task_postponed: "bg-violet-soft",
  task_missed: "bg-silver-soft",
  points_awarded: "bg-yellow",
  badge_earned: "bg-yellow",
  reward_unlocked: "bg-lilac-soft",
  member_joined: "bg-violet-soft",
  guide_updated: "bg-lime-soft",
};

export default function ActivityPage() {
  const activity = useFamilyStore((s) => s.activity);
  const tasks = useFamilyStore((s) => s.tasks);
  const taskIds = new Set(tasks.map((t) => t.id));

  return (
    <>
      <header className="px-4 pt-6">
        <h1 className="font-display text-2xl uppercase">Активность</h1>
        <p className="mt-1 text-sm font-semibold text-ink/55">Что происходит в семье</p>
      </header>

      <main className="flex-1 space-y-2.5 px-4 pb-6 pt-4">
        {activity.length === 0 && (
          <p className="rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
            Пока тихо — выполните первую задачу
          </p>
        )}
        {activity.map((event) => {
          const card = (
            <Facet shape={shapeFor(event.id)} fillClassName="flex items-start gap-3 bg-white px-4 py-3">
              <Facet kind="gem" shape={shapeFor(event.type)} shadow="none" className="h-9 w-9 shrink-0" fillClassName={`flex items-center justify-center ${TONES[event.type]}`}>
                <Icon name={ICONS[event.type]} className="h-4 w-4" />
              </Facet>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{event.message}</p>
                <p className="mt-0.5 text-xs font-bold uppercase text-ink/40">{relativeTime(event.createdAt)}</p>
              </div>
              {typeof event.points === "number" && (
                <Facet shape={shapeFor(event.id) + 2} shadow="none" fillClassName="bg-lime px-2.5 py-1">
                  <span className="font-display text-[11px]">+{event.points}</span>
                </Facet>
              )}
            </Facet>
          );
          // Entries about a task this phone has open the task itself — so a
          // task someone just gave you can be answered from here too.
          return event.taskId && taskIds.has(event.taskId) ? (
            <Link key={event.id} href={`/tasks/remind?id=${event.taskId}`} className="block">
              {card}
            </Link>
          ) : (
            <div key={event.id}>{card}</div>
          );
        })}
      </main>

      <BottomNav />
    </>
  );
}
