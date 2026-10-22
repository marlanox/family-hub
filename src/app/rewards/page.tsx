"use client";

import { BottomNav } from "@/components/BottomNav";
import { Facet, facetClipPath, shapeFor } from "@/components/Facet";
import { GoalProgress } from "@/components/GoalProgress";
import { Icon } from "@/components/Icon";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { CapybaraArt } from "@/components/PetArt";
import { pointsToNextTrophy, TROPHY_EVERY } from "@/lib/stats";
import { useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import Link from "next/link";
import { useState } from "react";

export default function RewardsPage() {
  const members = useFamilyStore((s) => s.members);
  const familyPoints = useFamilyStore((s) => s.familyPoints);
  const rewardName = useFamilyStore((s) => s.currentFamilyRewardName());
  const familyRewardHistory = useFamilyStore((s) => s.familyRewardHistory);
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const ranked = [...members].sort((a, b) => b.points - a.points);

  return (
    <>
      <header className="flex flex-col items-center gap-3 px-4 pt-6">
        {/* graffiti tag sprayed on a black-and-white brick wall */}
        <Facet shape={2} shadow="md" className="w-full -rotate-1" fillClassName="brick-wall relative px-4 pb-8 pt-5">
          <h1 className="spray-tag text-center font-graffiti text-[2.9rem] leading-none">Hall of Fame</h1>
          <span className="paint-drip" style={{ left: "22%", top: "60%", height: 18 }} />
          <span className="paint-drip" style={{ left: "49%", top: "62%", height: 26 }} />
          <span className="paint-drip" style={{ left: "74%", top: "60%", height: 14 }} />
          <span className="absolute bottom-2 right-4 rotate-[-7deg] font-tag text-base text-lemon">keep it real</span>
        </Facet>
        {/* pin-up ribbon on b/w polka dots */}
        <Facet shape={5} className="rotate-1" fillClassName="polka-bw p-1.5">
          <Facet shape={1} shadow="none" fillClassName="bg-white px-4 py-1.5 text-center">
            <span className="font-display text-sm uppercase leading-tight">
              Если ты думаешь, что ты Snoop Dogg — веди себя как Snoop Dogg
            </span>
          </Facet>
        </Facet>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-6 pt-4">
        <div className="flex items-center justify-center gap-2">
          <CapybaraArt className="h-36 w-36 shrink-0 -rotate-2" />
          <Facet shape={4} className="scrap-tape rotate-3" fillClassName="bg-white px-4 py-2.5">
            <span className="font-display text-sm uppercase leading-tight">
              Поднапрягись,
              <br />
              рок-н-ролльщик!
            </span>
          </Facet>
        </div>

        <Facet shape={0} fillClassName="flex gap-1 bg-white p-1.5">
          {(["week", "month", "all"] as const).map((p, i) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 font-display text-xs uppercase ${period === p ? "bg-ink text-white" : "text-ink"}`}
              style={period === p ? { clipPath: facetClipPath(i + 1) } : undefined}
            >
              {p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Всё время"}
            </button>
          ))}
        </Facet>
        {period !== "all" && (
          <p className="-mt-3 px-1 text-center text-[11px] font-semibold text-ink/40">
            Пока считаем только за всё время — разбивка по неделям скоро появится
          </p>
        )}

        <div className="space-y-5 pt-2 landscape:grid landscape:grid-cols-2 landscape:items-start landscape:gap-x-4 landscape:gap-y-5 landscape:space-y-0">
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
          <h2 className="px-1 font-display text-lg uppercase">★ Личные кубки</h2>
          <p className="mb-2 px-1 text-sm font-bold">🏆 Кубок даётся за каждые {TROPHY_EVERY} баллов — сам, ничего нажимать не нужно.</p>
          <div className="space-y-2 landscape:grid landscape:grid-cols-2 landscape:items-start landscape:gap-2.5 landscape:space-y-0">
            {members.map((m) => {
              // Straight from points (one per full thousand), so it always
              // agrees with the score shown everywhere else.
              const count = Math.floor(m.points / TROPHY_EVERY);
              return (
                <Link key={m.id} href={`/profile?member=${m.id}`} className="block">
                  <Facet shape={shapeFor(m.id) + 1} fillClassName="flex items-center gap-3 bg-white px-4 py-3">
                    <Facet kind="gem" shape={shapeFor(m.id)} shadow="none" className="h-10 w-10 shrink-0" fillClassName="glitter-gold flex items-center justify-center">
                      <Icon name="trophy" className="h-5 w-5" />
                    </Facet>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm uppercase">{m.displayName}</p>
                      <p className="text-[11px] font-bold text-ink/50">до следующего — {pointsToNextTrophy(m.points)} баллов</p>
                    </div>
                    <p className="font-display text-sm">×{count}</p>
                  </Facet>
                </Link>
              );
            })}
          </div>
        </div>

        {familyRewardHistory.length > 0 && (
          <div>
            <h2 className="mb-2 px-1 font-display text-lg uppercase">★ История семейных наград</h2>
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
          className="flex items-center justify-center gap-1 border-3 border-ink bg-white py-2.5 font-display text-xs uppercase shadow-pop-sm"
        >
          Вся активность семьи <span aria-hidden>→</span>
        </Link>
      </main>

      <BottomNav />
    </>
  );
}
