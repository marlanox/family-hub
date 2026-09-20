"use client";

import { BadgeChip } from "@/components/BadgeChip";
import { BottomNav } from "@/components/BottomNav";
import { FamilyMemberSticker } from "@/components/FamilyMemberSticker";
import { Icon } from "@/components/Icon";
import { TaskCard } from "@/components/TaskCard";
import { accentMap } from "@/lib/colors";
import { todayISO } from "@/lib/schedule";
import { useFamilyStore } from "@/lib/store";
import type { IconKey } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

const BADGE_LABELS: Record<string, { emoji: string; name: string }> = {
  "early-bird": { emoji: "🌅", name: "Ранняя пташка" },
  "streak-7": { emoji: "🔥", name: "7 дней подряд" },
  "streak-30": { emoji: "🔥", name: "30 дней подряд" },
};

function badgeLabel(id: string) {
  if (BADGE_LABELS[id]) return BADGE_LABELS[id];
  if (id.startsWith("points-")) {
    const n = id.split("-")[1];
    return { emoji: "🏅", name: `${Number(n) * 1000} баллов` };
  }
  return { emoji: "⭐", name: id };
}

type Tab = "tasks" | "achievements" | "stats";

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const preselected = useSearchParams().get("member");
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.todaysTasks());
  const occurrences = useFamilyStore((s) => s.occurrences);
  const earnedBadges = useFamilyStore((s) => s.earnedBadges);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const updateMemberPhoto = useFamilyStore((s) => s.updateMemberPhoto);
  const whoAmI = useFamilyStore((s) => s.whoAmI);

  const [selectedId, setSelectedId] = useState(preselected ?? members[0]?.id);
  const [tab, setTab] = useState<Tab>("tasks");
  const fileRef = useRef<HTMLInputElement>(null);

  const member = members.find((m) => m.id === selectedId) ?? members[0];
  if (!member) return null;

  const rank = [...members].sort((a, b) => b.points - a.points).findIndex((m) => m.id === member.id) + 1;
  const myBadges = earnedBadges.filter((b) => b.memberId === member.id);
  const myTasks = tasks.filter(
    (t) => t.assignee.kind === "family" || t.assignee.memberIds.includes(member.id),
  );
  const key = todayISO();

  const onPhotoChosen = (file: File) => {
    const memberId = member.id;
    const reader = new FileReader();
    reader.onload = () => updateMemberPhoto(memberId, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <header className={`rounded-torn border-b-3 border-ink px-4 pb-6 pt-6 ${accentMap[member.accentColor].bgSoft}`}>
        <div className="flex justify-center gap-2">
          {members.map((m) => (
            <button key={m.id} onClick={() => setSelectedId(m.id)} className="relative">
              <span
                className={`block h-10 w-10 overflow-hidden rounded-full border-3 border-ink ${
                  m.id === member.id ? "opacity-100" : "opacity-40"
                }`}
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-white font-display text-xs">
                    {m.displayName.charAt(0)}
                  </span>
                )}
              </span>
              {m.id === whoAmI && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-mint px-1 text-[8px] font-bold uppercase leading-tight">
                  ты
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="relative">
            <FamilyMemberSticker member={member} size="lg" crown={rank === 1} />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Изменить фото"
              className="absolute -right-1 bottom-6 flex h-8 w-8 items-center justify-center rounded-full border-3 border-ink bg-white shadow-pop-sm"
            >
              ✏️
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPhotoChosen(e.target.files[0])}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-6 pt-4">
        <div className="flex gap-2.5">
          <BadgeChip emoji="🔥" value={member.currentStreak} label="дней подряд" />
          <BadgeChip emoji="🏆" value={member.completedTaskCount} label="задач выполнено" />
          <BadgeChip emoji="⭐" value={myBadges.length} label="значков" />
        </div>

        <div className="flex rounded-full border-3 border-ink bg-white p-1 shadow-pop-sm">
          {([
            ["tasks", "Мои задачи"],
            ["achievements", "Достижения"],
            ["stats", "Статистика"],
          ] as [Tab, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-full py-1.5 font-display text-[11px] uppercase ${
                tab === value ? "bg-ink text-white" : "text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "tasks" && (
          <div className="space-y-2.5">
            {myTasks.map((t) => {
              const status = occurrences[`${t.id}__${key}`]?.status ?? "pending";
              return (
                <TaskCard
                  key={t.id}
                  icon={t.icon}
                  color={t.color}
                  title={t.title}
                  assigneeLabel={member.displayName}
                  timeLabel={t.dueTime ? `до ${t.dueTime}` : "сегодня"}
                  points={t.points}
                  completed={status === "completed"}
                  onToggle={() => status !== "completed" && completeTask(t.id)}
                />
              );
            })}
            {myTasks.length === 0 && (
              <p className="rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
                На сегодня задач нет
              </p>
            )}
          </div>
        )}

        {tab === "achievements" && (
          <div className="grid grid-cols-2 gap-2.5">
            {myBadges.map((b, i) => {
              const label = badgeLabel(b.badgeId);
              return (
                <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border-3 border-ink bg-white p-3 text-center shadow-pop-sm">
                  <span className="text-2xl">{label.emoji}</span>
                  <span className="text-xs font-bold">{label.name}</span>
                </div>
              );
            })}
            {myBadges.length === 0 && (
              <p className="col-span-2 rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
                Значков пока нет — впереди много дел
              </p>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-2">
            <StatRow icon="star" label="Место в рейтинге" value={`#${rank}`} />
            <StatRow icon="trophy" label="Баллов всего заработано" value={member.points} />
            <StatRow icon="checklist" label="Задач выполнено" value={member.completedTaskCount} />
            <StatRow icon="alarm" label="Лучшая серия дней" value={member.longestStreak} />
          </div>
        )}
      </main>

      <BottomNav />
    </>
  );
}

function StatRow({ icon, label, value }: { icon: IconKey; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-sky-soft">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <p className="flex-1 text-sm font-semibold">{label}</p>
      <p className="font-display text-lg">{value}</p>
    </div>
  );
}
