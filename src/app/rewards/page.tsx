"use client";

import { BottomNav } from "@/components/BottomNav";
import { GoalProgress } from "@/components/GoalProgress";
import { Icon } from "@/components/Icon";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { CapybaraArt } from "@/components/PetArt";
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
      <header className="flex flex-col items-center gap-3 px-4 pt-6">
        {/* graffiti tag sprayed on a black-and-white brick wall */}
        <div className="brick-wall relative w-full -rotate-1 overflow-hidden rounded-xl border-3 border-ink px-4 pb-7 pt-4 shadow-pop">
          <h1 className="spray-tag text-center font-graffiti text-5xl leading-none">РЕЙТИНГ</h1>
          <span className="paint-drip" style={{ left: "24%", top: "62%", height: 18 }} />
          <span className="paint-drip" style={{ left: "47%", top: "64%", height: 26 }} />
          <span className="paint-drip" style={{ left: "71%", top: "62%", height: 14 }} />
          <span className="absolute bottom-1.5 right-3 rotate-[-6deg] font-graffiti text-sm text-lemon">ПАНК НЕ УМЕР</span>
        </div>
        {/* pin-up ribbon on b/w polka dots */}
        <p className="polka-bw rotate-1 rounded-full border-3 border-ink px-1 py-1 shadow-pop-sm">
          <span className="block rounded-full bg-white px-4 py-1 text-center font-pinup text-lg leading-tight">
            Кто сегодня королева, а кто — ленивый лев?
          </span>
        </p>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-6 pt-4">
        <div className="flex items-center justify-center gap-2">
          <CapybaraArt className="h-36 w-36 shrink-0 -rotate-2" />
          <span className="scrap-tape rotate-3 border-3 border-ink bg-white px-3 py-2 font-pinup text-lg leading-tight shadow-pop-sm">
            Поднапрягись,
            <br />
            рок-н-ролльщик!
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

        <div className="space-y-5 pt-2">
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
          <h2 className="mb-2 px-1 font-pinup text-2xl">★ Личные кубки ★</h2>
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
            <h2 className="mb-2 px-1 font-pinup text-2xl">★ История семейных наград ★</h2>
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
