"use client";

import { BottomNav } from "@/components/BottomNav";
import { BurstTitle } from "@/components/BurstTitle";
import { ComicButton } from "@/components/ComicButton";
import { GoalProgress } from "@/components/GoalProgress";
import { Icon } from "@/components/Icon";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import { useState } from "react";

export default function RewardsPage() {
  const members = useFamilyStore((s) => s.members);
  const rewards = useFamilyStore((s) => s.rewards);
  const familyPoints = useFamilyStore((s) => s.familyPoints);
  const activity = useFamilyStore((s) => s.activity);
  const redeemReward = useFamilyStore((s) => s.redeemReward);
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const ranked = [...members].sort((a, b) => b.points - a.points);
  const topPoints = Math.max(...members.map((m) => m.points), 1);

  return (
    <>
      <header className="flex flex-col items-center gap-2 px-4 pt-6">
        <BurstTitle color="yellow">РЕЙТИНГ</BurstTitle>
        <p className="text-center text-xs font-bold text-ink/50">
          Кто сегодня королева, а кто — ленивый лев?
        </p>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-6 pt-4">
        <div className="flex rounded-full border-3 border-ink bg-white p-1 shadow-pop-sm">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-full py-1.5 font-display text-xs uppercase ${
                period === p ? "bg-ink text-white" : "text-ink"
              }`}
            >
              {p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Всё время"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {ranked.map((m, i) => (
            <LeaderboardRow key={m.id} rank={i + 1} member={m} />
          ))}
        </div>

        <GoalProgress
          title="Семейная цель"
          subtitle="1000 баллов = мини-подарок"
          current={familyPoints}
          target={1000}
        />

        <div>
          <h2 className="mb-2 px-1 font-display text-lg uppercase">Награды</h2>
          <div className="space-y-2.5">
            {rewards.map((r) => {
              const progressBase = r.scope === "family" ? familyPoints : topPoints;
              const pct = Math.min(100, Math.round((progressBase / r.pointsRequired) * 100));
              const unlocked = progressBase >= r.pointsRequired;
              return (
                <div key={r.id} className="rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-3 border-ink bg-yellow">
                      <Icon name={r.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm">{r.name}</p>
                      <p className="text-xs font-semibold text-ink/50">
                        {r.scope === "family" ? "Семейная" : "Личная"} · {r.pointsRequired} баллов
                      </p>
                    </div>
                    {r.redeemed ? (
                      <span className="rounded-full border-2 border-ink bg-mint px-2 py-1 text-[10px] font-bold uppercase">
                        Получено
                      </span>
                    ) : (
                      <ComicButton
                        variant={unlocked ? "pink" : "outline"}
                        className="!px-3 !py-1.5 !text-[11px]"
                        disabled={!unlocked}
                        onClick={() => redeemReward(r.id)}
                      >
                        Забрать
                      </ComicButton>
                    )}
                  </div>
                  {!r.redeemed && (
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
                      <div className="h-full bg-mint" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-1 font-display text-lg uppercase">Последние достижения</h2>
          <div className="space-y-2">
            {activity.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border-2 border-ink/20 bg-white px-3 py-2">
                <p className="text-xs font-semibold">{a.message}</p>
                <p className="text-[10px] font-bold uppercase text-ink/40">{relativeTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}
