"use client";

import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import type { ActivityEventType, IconKey } from "@/lib/types";

const ICONS: Record<ActivityEventType, IconKey> = {
  task_completed: "checklist",
  task_refused: "close",
  task_postponed: "clock",
  task_missed: "clock",
  points_awarded: "star",
  badge_earned: "star",
  reward_unlocked: "gift",
  member_joined: "family",
};

const TONES: Record<ActivityEventType, string> = {
  task_completed: "bg-mint",
  task_refused: "bg-pink-soft",
  task_postponed: "bg-sky-soft",
  task_missed: "bg-coral-soft",
  points_awarded: "bg-yellow",
  badge_earned: "bg-yellow",
  reward_unlocked: "bg-lilac-soft",
  member_joined: "bg-sky-soft",
};

export default function ActivityPage() {
  const activity = useFamilyStore((s) => s.activity);

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
        {activity.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink ${TONES[event.type]}`}>
              <Icon name={ICONS[event.type]} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{event.message}</p>
              <p className="mt-0.5 text-xs font-bold uppercase text-ink/40">{relativeTime(event.createdAt)}</p>
            </div>
            {typeof event.points === "number" && (
              <span className="rounded-full border-2 border-ink bg-mint px-2 py-1 font-display text-[11px]">
                +{event.points}
              </span>
            )}
          </div>
        ))}
      </main>

      <BottomNav />
    </>
  );
}
