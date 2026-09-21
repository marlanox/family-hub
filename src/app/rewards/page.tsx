"use client";

import { BottomNav } from "@/components/BottomNav";
import { BurstTitle } from "@/components/BurstTitle";
import { GoalProgress } from "@/components/GoalProgress";
import { Icon } from "@/components/Icon";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { DogArt } from "@/components/PetArt";
import { useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import Link from "next/link";
import { useState } from "react";

export default function RewardsPage() {
  const members = useFamilyStore((s) => s.members);
  const familyPoints = useFamilyStore((s) => s.familyPoints);
  const rewardName = useFamilyStore((s) => s.currentFamilyRewardName());
  const familyRewardHistory = useFamilyStore((s) => s.familyRewardHistory);
  const earnedBadges = useFamilyStore((s) => s.earnedBadges);
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const ranked = [...members].sort((a, b) => b.points - a.points);

  return (
    <>
      <header className="flex flex-col items-center gap-2 px-4 pt-6">
        <BurstTitle color="yellow">РЕЙТИНГ</BurstTitle>
        <p className="text-center text-xs font-bold text-ink/50">
          Кто сегодня королева, а кто — ленивый лев?
        </p>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-6 pt-4">
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-3 border-ink bg-coral-soft shadow-pop">
            <DogArt className="h-24 w-24" />
          </span>
          <span className="rounded-2xl border-3 border-ink bg-white px-3 py-1.5 font-display text-xs shadow-pop-sm -rotate-2">
            Даже мы болеем за вас!
          </span>
        </div>

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
        {period !== "all" && (
          <p className="-mt-3 px-1 text-center text-[11px] font-semibold text-ink/40">
            Пока считаем только за всё время — разбивка по неделям скоро появится
          </p>
        )}

        <div className="space-y-2">
          {ranked.map((m, i) => (
            <LeaderboardRow key={m.id} rank={i + 1} member={m} />
          ))}
        </div>

        <GoalProgress
          title="Семейная цель"
          subtitle={`5000 баллов = ${rewardName}`}
          current={familyPoints}
          target={5000}
        />

        <div>
          <h2 className="mb-2 px-1 font-display text-lg uppercase">Личные кубки</h2>
          <div className="space-y-2">
            {members.map((m) => {
              const count = earnedBadges.filter((b) => b.memberId === m.id && b.badgeId.startsWith("points-")).length;
              return (
                <Link
                  key={m.id}
                  href={`/profile?member=${m.id}`}
                  className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-yellow">
                    <Icon name="trophy" className="h-4 w-4" />
                  </span>
                  <p className="flex-1 font-display text-sm">{m.displayName}</p>
                  <p className="font-display text-sm">×{count}</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-1.5 px-1 text-[11px] font-semibold text-ink/40">
            Кубок появляется автоматически за каждую новую 1000 баллов у человека — забирать вручную не нужно.
          </p>
        </div>

        {familyRewardHistory.length > 0 && (
          <div>
            <h2 className="mb-2 px-1 font-display text-lg uppercase">История семейных наград</h2>
            <div className="space-y-2">
              {familyRewardHistory.map((r) => (
                <div key={r.tier} className="flex items-center justify-between rounded-xl border-2 border-ink/20 bg-white px-3 py-2">
                  <p className="text-sm font-bold">
                    #{r.tier} · {r.name}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-ink/40">{relativeTime(r.unlockedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/activity"
          className="flex items-center justify-center gap-1 rounded-full border-3 border-ink bg-white py-2.5 font-display text-xs uppercase shadow-pop-sm"
        >
          Вся активность семьи <span aria-hidden>→</span>
        </Link>
      </main>

      <BottomNav />
    </>
  );
}
