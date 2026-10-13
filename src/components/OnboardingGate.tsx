"use client";

import { useState, type ReactNode } from "react";
import { ComicButton } from "./ComicButton";
import { ColorPicker } from "./ColorPicker";
import { Sticker } from "./Sticker";
import { useFamilyStore } from "@/lib/store";
import { enablePushForMember, pushSupported } from "@/lib/push";
import type { FamilyMember } from "@/lib/types";

/**
 * Gates the whole app behind two local-only steps — no backend, no
 * account, nothing leaves the device:
 *  1. If there's no family yet, build one (this replaces shipping with
 *     hardcoded Маша/Наташа/Ваня demo data).
 *  2. If a family exists but this device hasn't said who's holding it,
 *     ask — this is what lets "Ваня выполнил задачу" mean something,
 *     and what a future push-notification backend would key off of.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const hasHydrated = useFamilyStore((s) => s.hasHydrated);
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);
  const finishOnboarding = useFamilyStore((s) => s.finishOnboarding);
  const pushPromptSeen = useFamilyStore((s) => s.pushPromptSeen);
  const markPushPromptSeen = useFamilyStore((s) => s.markPushPromptSeen);

  if (!hasHydrated) return null;
  // Stored in the persisted state (not local component state) so that
  // "Сбросить все данные" in Settings reliably re-arms this flow — a
  // local flag here would stay stuck on "done" across the reset.
  if (members.length === 0 || !onboardingComplete) {
    return <CreateFamily onDone={finishOnboarding} />;
  }
  if (!whoAmI) return <PickWhoAmI />;
  // The toggle for this lives in Settings, and in practice almost nobody
  // found it there on their own — asking directly, once, right after
  // picking who you are, is what actually gets people subscribed.
  if (pushSupported && !pushPromptSeen && typeof Notification !== "undefined" && Notification.permission === "default") {
    return <EnableNotifications whoAmI={whoAmI} onDone={markPushPromptSeen} />;
  }
  return <>{children}</>;
}

function EnableNotifications({ whoAmI, onDone }: { whoAmI: string; onDone: () => void }) {
  const [working, setWorking] = useState(false);

  async function handleEnable() {
    setWorking(true);
    await enablePushForMember(whoAmI);
    onDone();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="font-display text-2xl uppercase leading-tight">Включить уведомления?</h1>
      <p className="max-w-xs text-sm font-semibold text-ink/60">
        Так ты узнаешь, когда тебе назначили задачу или пришло время её делать — даже если телефон в кармане.
      </p>
      <ComicButton variant="mint" size="lg" onClick={handleEnable} disabled={working}>
        🔔 Включить уведомления
      </ComicButton>
      <ComicButton variant="outline" onClick={onDone}>
        Пропустить
      </ComicButton>
    </main>
  );
}

function CreateFamily({ onDone }: { onDone: () => void }) {
  const addMember = useFamilyStore((s) => s.addMember);
  const setWhoAmI = useFamilyStore((s) => s.setWhoAmI);
  const [step, setStep] = useState<"me" | "others">("me");
  const [name, setName] = useState("");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("pink");
  const [othersName, setOthersName] = useState("");
  const [othersColor, setOthersColor] = useState<FamilyMember["accentColor"]>("sky");
  const members = useFamilyStore((s) => s.members);

  function createMe() {
    if (!name.trim()) return;
    const id = addMember(name.trim(), color);
    setWhoAmI(id);
    setStep("others");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {step === "me" ? (
        <>
          <h1 className="font-display text-2xl uppercase leading-tight">Привет! Как тебя зовут?</h1>
          <p className="max-w-xs text-sm font-semibold text-ink/60">
            Это устройство запомнит, что оно твоё — так остальные будут видеть, кто выполнил задачу.
          </p>
          <Sticker className="w-full max-w-xs space-y-4 p-5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Твоё имя"
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 text-center font-display text-lg outline-none"
            />
            <div className="flex justify-center">
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </Sticker>
          <ComicButton variant="mint" size="lg" onClick={createMe} disabled={!name.trim()}>
            Это я →
          </ComicButton>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl uppercase leading-tight">Добавим остальных?</h1>
          <p className="max-w-xs text-sm font-semibold text-ink/60">
            Каждый сможет позже поставить своё фото и добавлять/убирать людей — прав у всех поровну.
          </p>

          {members.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full border-3 border-ink bg-white px-3 py-1 font-display text-xs uppercase shadow-pop-sm"
                >
                  {m.displayName}
                </span>
              ))}
            </div>
          )}

          <Sticker className="w-full max-w-xs space-y-4 p-5">
            <input
              value={othersName}
              onChange={(e) => setOthersName(e.target.value)}
              placeholder="Имя члена семьи"
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 text-center font-display text-lg outline-none"
            />
            <div className="flex justify-center">
              <ColorPicker value={othersColor} onChange={setOthersColor} />
            </div>
            <ComicButton
              variant="sky"
              className="w-full"
              onClick={() => {
                if (!othersName.trim()) return;
                addMember(othersName.trim(), othersColor);
                setOthersName("");
              }}
            >
              + Добавить
            </ComicButton>
          </Sticker>

          <ComicButton variant="pink" size="lg" onClick={onDone}>
            Готово, дальше →
          </ComicButton>
        </>
      )}
    </main>
  );
}

function PickWhoAmI() {
  const members = useFamilyStore((s) => s.members);
  const setWhoAmI = useFamilyStore((s) => s.setWhoAmI);
  const addMember = useFamilyStore((s) => s.addMember);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("mint");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="font-display text-2xl uppercase leading-tight">Это чей телефон?</h1>
      <p className="max-w-xs text-sm font-semibold text-ink/60">Выбери себя — это только для этого устройства.</p>

      {!adding ? (
        <>
          <div className="grid w-full max-w-xs grid-cols-2 gap-3">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setWhoAmI(m.id)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-lg">
                  {m.displayName.charAt(0)}
                </span>
                <span className="font-display text-xs uppercase">{m.displayName}</span>
              </button>
            ))}
          </div>
          <ComicButton variant="outline" onClick={() => setAdding(true)}>
            Меня здесь нет — добавить себя
          </ComicButton>
        </>
      ) : (
        <Sticker className="w-full max-w-xs space-y-4 p-5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Твоё имя"
            className="w-full rounded-xl border-3 border-ink px-3 py-2.5 text-center font-display text-lg outline-none"
          />
          <div className="flex justify-center">
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <ComicButton
            variant="mint"
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              const id = addMember(name.trim(), color);
              setWhoAmI(id);
            }}
          >
            Это я →
          </ComicButton>
        </Sticker>
      )}
    </main>
  );
}
