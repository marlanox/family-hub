"use client";

import { ComicButton } from "@/components/ComicButton";
import { ColorPicker } from "@/components/ColorPicker";
import { Icon } from "@/components/Icon";
import { useFamilyStore } from "@/lib/store";
import type { FamilyMember } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.members);
  const addMember = useFamilyStore((s) => s.addMember);
  const removeMember = useFamilyStore((s) => s.removeMember);
  const soundEnabled = useFamilyStore((s) => s.soundEnabled);
  const toggleSound = useFamilyStore((s) => s.toggleSound);

  const [name, setName] = useState("");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("mint");

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-6">
        <button onClick={() => router.push("/")} aria-label="Назад" className="rounded-full border-3 border-ink bg-white p-2 shadow-pop-sm">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl uppercase">Настройки семьи</h1>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-8 pt-4">
        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Члены семьи</h2>
          <p className="mb-3 px-1 text-xs font-semibold text-ink/50">
            У всех одинаковые права: любой может добавлять и назначать задачи, менять фото, приглашать и убирать
            членов семьи. Ролей «админ»/«участник» нет.
          </p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-sm">
                  {m.displayName.charAt(0)}
                </span>
                <p className="flex-1 font-semibold">{m.displayName}</p>
                <button
                  onClick={() => confirm(`Убрать ${m.displayName} из семьи?`) && removeMember(m.id)}
                  className="rounded-full border-2 border-ink px-2 py-1 text-[11px] font-bold uppercase text-pink-deep"
                >
                  Убрать
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2 rounded-2xl border-3 border-dashed border-ink/30 p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя нового члена семьи"
              className="w-full rounded-xl border-3 border-ink px-3 py-2 font-semibold outline-none"
            />
            <ColorPicker value={color} onChange={setColor} />
            <ComicButton
              variant="mint"
              className="w-full"
              onClick={() => {
                if (!name.trim()) return;
                addMember(name.trim(), color);
                setName("");
              }}
            >
              Добавить в семью
            </ComicButton>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Звук</h2>
          <label className="flex items-center justify-between rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
            <span className="font-semibold">Весёлые звуки за успехи</span>
            <input type="checkbox" checked={soundEnabled} onChange={toggleSound} className="h-6 w-6 accent-pink" />
          </label>
        </section>

        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Где хранятся данные</h2>
          <div className="space-y-2 rounded-2xl border-3 border-ink bg-white p-3 text-sm font-semibold shadow-pop-sm">
            <p>
              Сейчас всё хранится прямо на этом устройстве (офлайн, бесплатно, без аккаунта). Чтобы баллы и задачи
              синхронизировались между телефонами всей семьи, подключите бесплатный Supabase-проект — инструкция в{" "}
              <code className="rounded bg-paper px-1">README.md</code> репозитория.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
