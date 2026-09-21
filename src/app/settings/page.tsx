"use client";

import { ComicButton } from "@/components/ComicButton";
import { ColorPicker } from "@/components/ColorPicker";
import { Icon } from "@/components/Icon";
import { playSound, SOUND_THEMES } from "@/lib/sound";
import { isSyncAvailable, usingCustomSupabase, activeSupabaseUrl } from "@/lib/supabaseClient";
import { enablePushForMember, pushSupported } from "@/lib/push";
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
  const soundTheme = useFamilyStore((s) => s.soundTheme);
  const setSoundTheme = useFamilyStore((s) => s.setSoundTheme);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const setWhoAmI = useFamilyStore((s) => s.setWhoAmI);
  const resetAll = useFamilyStore((s) => s.resetAll);
  const familyCode = useFamilyStore((s) => s.familyCode);
  const syncing = useFamilyStore((s) => s.syncing);
  const enableSync = useFamilyStore((s) => s.enableSync);
  const joinSync = useFamilyStore((s) => s.joinSync);
  const leaveSync = useFamilyStore((s) => s.leaveSync);
  const pullSync = useFamilyStore((s) => s.pullSync);
  const lastSyncedAt = useFamilyStore((s) => s.lastSyncedAt);
  const lastSyncError = useFamilyStore((s) => s.lastSyncError);
  const clearSyncError = useFamilyStore((s) => s.clearSyncError);
  const setCustomSupabaseConfig = useFamilyStore((s) => s.setCustomSupabaseConfig);
  const me = members.find((m) => m.id === whoAmI);

  const [name, setName] = useState("");
  const [color, setColor] = useState<FamilyMember["accentColor"]>("mint");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ownProjectOpen, setOwnProjectOpen] = useState(false);
  const [ownUrl, setOwnUrl] = useState("");
  const [ownKey, setOwnKey] = useState("");
  const [creatingSync, setCreatingSync] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-6">
        <button onClick={() => router.back()} aria-label="Назад" className="rounded-full border-3 border-ink bg-white p-2 shadow-pop-sm">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl uppercase">Настройки семьи</h1>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-8 pt-4">
        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Это устройство</h2>
          <div className="flex items-center justify-between rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
            <span className="font-semibold">
              Ты сейчас: <span className="font-display">{me?.displayName ?? "не выбрано"}</span>
            </span>
            <ComicButton variant="outline" className="!px-3 !py-1.5 !text-[11px]" onClick={() => setWhoAmI(null)}>
              Сменить
            </ComicButton>
          </div>
        </section>

        {isSyncAvailable() && familyCode && whoAmI && (
          <section>
            <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Уведомления на этот телефон</h2>
            <p className="mb-2 px-1 text-xs font-semibold text-ink/50">
              Когда кто-то в семье выполнит или отменит задачу — вы получите пуш, даже если приложение закрыто.
              На iPhone это работает, только если приложение установлено на домашний экран (не просто открыто в
              Safari) и на iOS 16.4 или новее.
            </p>
            <ComicButton
              variant="mint"
              className="w-full"
              disabled={pushBusy || !pushSupported}
              onClick={async () => {
                setPushBusy(true);
                setPushStatus(null);
                const result = await enablePushForMember(whoAmI);
                setPushBusy(false);
                setPushStatus(
                  result === "subscribed"
                    ? "Готово ✓ Уведомления включены на этом телефоне."
                    : result === "denied"
                      ? "Разрешение не дано — включите уведомления для этого сайта в настройках телефона."
                      : result === "unsupported"
                        ? "Этот браузер не поддерживает уведомления (или приложение не установлено на домашний экран)."
                        : "Не получилось — проверьте интернет и попробуйте ещё раз.",
                );
              }}
            >
              {pushBusy ? "Включаем…" : "🔔 Включить уведомления"}
            </ComicButton>
            {pushStatus && <p className="mt-2 px-1 text-xs font-bold">{pushStatus}</p>}
          </section>
        )}

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
                <p className="flex-1 font-semibold">
                  {m.displayName}
                  {m.id === whoAmI && (
                    <span className="ml-2 rounded-full border-2 border-ink bg-mint px-2 py-0.5 text-[10px] font-bold uppercase">
                      это ты
                    </span>
                  )}
                </p>
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
          <p className="mb-2 mt-3 px-1 text-xs font-semibold text-ink/50">
            Выберите звук — он будет использоваться во всём приложении.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SOUND_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSoundTheme(t.id);
                  playSound("preview", true, t.id);
                }}
                className={`flex items-center justify-between rounded-2xl border-3 border-ink px-3 py-2.5 text-left font-semibold shadow-pop-sm transition ${
                  soundTheme === t.id ? "bg-mint" : "bg-white"
                }`}
              >
                <span>
                  {t.emoji} {t.label}
                </span>
                {soundTheme === t.id && <span aria-hidden>✓</span>}
              </button>
            ))}
          </div>
          <ComicButton
            variant="yellow"
            className="mt-2 w-full"
            onClick={() => playSound("preview", true, soundTheme)}
          >
            🔊 Проверить звук
          </ComicButton>
        </section>

        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Синхронизация между телефонами</h2>

          {!isSyncAvailable() && (
            <div className="space-y-2 rounded-2xl border-3 border-ink bg-white p-3 text-sm font-semibold shadow-pop-sm">
              <p>
                Сейчас всё хранится только на этом устройстве (офлайн, бесплатно, без аккаунта). Чтобы баллы и
                задачи синхронизировались между телефонами семьи, сначала подключите свой бесплатный
                Supabase-проект в разделе «Своё облако» ниже — без этого шага у всех есть выбор не создавать
                облако вообще, но нет выбора использовать чьё-то чужое: у каждой семьи оно только своё.
              </p>
            </div>
          )}

          {isSyncAvailable() && !familyCode && (
            <div className="space-y-3">
              <p className="px-1 text-xs font-semibold text-ink/50">
                Один человек создаёт код, остальные вводят его на своих телефонах — дальше баллы и задачи общие.
              </p>
              <ComicButton
                variant="mint"
                className="w-full"
                disabled={creatingSync}
                onClick={async () => {
                  setCreateError(null);
                  clearSyncError();
                  setCreatingSync(true);
                  const code = await enableSync();
                  setCreatingSync(false);
                  if (!code) setCreateError("Не получилось создать код.");
                }}
              >
                {creatingSync ? "Создаём…" : "Создать код синхронизации"}
              </ComicButton>
              {createError && (
                <p className="px-1 text-xs font-bold text-pink-deep">
                  {createError}
                  {lastSyncError ? ` Причина: ${lastSyncError}` : " Проверьте интернет и попробуйте ещё раз."}
                </p>
              )}
              <div className="rounded-2xl border-3 border-dashed border-ink/30 p-3 space-y-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Вставить код от другого телефона"
                  className="w-full rounded-xl border-3 border-ink px-3 py-2 font-semibold outline-none"
                />
                <ComicButton
                  variant="sky"
                  className="w-full"
                  disabled={syncing || !joinCode.trim()}
                  onClick={async () => {
                    setJoinError(null);
                    clearSyncError();
                    const ok = await joinSync(joinCode.trim());
                    if (!ok) setJoinError("Не получилось присоединиться.");
                  }}
                >
                  {syncing ? "Подключаем…" : "Присоединиться по коду"}
                </ComicButton>
                {joinError && (
                  <p className="text-xs font-bold text-pink-deep">
                    {joinError}
                    {lastSyncError ? ` Причина: ${lastSyncError}` : " Проверьте код и интернет."}
                  </p>
                )}
              </div>
            </div>
          )}

          {isSyncAvailable() && familyCode && (
            <div className="space-y-2">
              <div className="rounded-2xl border-3 border-ink bg-mint p-3 shadow-pop-sm">
                <p className="text-xs font-bold uppercase text-ink/60">Код вашей семьи</p>
                <p className="mt-1 break-all font-display text-sm">{familyCode}</p>
                <ComicButton
                  variant="outline"
                  className="mt-2 w-full !py-1.5 !text-xs"
                  onClick={() => {
                    navigator.clipboard?.writeText(familyCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Скопировано ✓" : "Скопировать код"}
                </ComicButton>
              </div>
              <p className="px-1 text-[11px] font-semibold text-ink/40">
                Введите этот код в настройках на других телефонах семьи. Обновляется автоматически каждые ~20 секунд,
                пока приложение открыто{lastSyncedAt ? ` · последний раз: ${new Date(lastSyncedAt).toLocaleTimeString("ru-RU")}` : ""}.
              </p>
              <div className="flex gap-2">
                <ComicButton variant="sky" className="flex-1 !text-xs" disabled={syncing} onClick={() => pullSync()}>
                  {syncing ? "Обновляем…" : "Обновить сейчас"}
                </ComicButton>
                <ComicButton variant="outline" className="flex-1 !text-xs" onClick={() => confirm("Отключить синхронизацию на этом устройстве?") && leaveSync()}>
                  Отключить
                </ComicButton>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Своё облако</h2>
          <p className="mb-2 px-1 text-xs font-semibold text-ink/50">
            Синхронизация работает только через ваш собственный бесплатный Supabase-проект (2 минуты, только
            email) — заведите его и впишите сюда. Прислали кому-то ссылку на это же приложение? Пусть заведёт свой
            отдельный проект и впишет его на своём телефоне — тогда его семья хранится в его собственном облаке, а
            не в вашем, и наоборот.
            {usingCustomSupabase() && activeSupabaseUrl() && (
              <>
                {" "}
                Сейчас это устройство использует: <code className="rounded bg-paper px-1 break-all">{activeSupabaseUrl()}</code>
              </>
            )}
          </p>
          {!ownProjectOpen ? (
            <ComicButton variant="outline" className="w-full" onClick={() => setOwnProjectOpen(true)}>
              {usingCustomSupabase() ? "Изменить свой проект" : "Подключить свой Supabase-проект"}
            </ComicButton>
          ) : (
            <div className="space-y-2 rounded-2xl border-3 border-dashed border-ink/30 p-3">
              <input
                value={ownUrl}
                onChange={(e) => setOwnUrl(e.target.value)}
                placeholder="Project URL (https://xxxx.supabase.co)"
                className="w-full rounded-xl border-3 border-ink px-3 py-2 text-sm font-semibold outline-none"
              />
              <input
                value={ownKey}
                onChange={(e) => setOwnKey(e.target.value)}
                placeholder="anon public key"
                className="w-full rounded-xl border-3 border-ink px-3 py-2 text-sm font-semibold outline-none"
              />
              <div className="flex gap-2">
                <ComicButton
                  variant="mint"
                  className="flex-1"
                  disabled={!ownUrl.trim() || !ownKey.trim()}
                  onClick={() => {
                    setCustomSupabaseConfig(ownUrl.trim(), ownKey.trim());
                    setOwnProjectOpen(false);
                    setOwnUrl("");
                    setOwnKey("");
                  }}
                >
                  Сохранить
                </ComicButton>
                {usingCustomSupabase() && (
                  <ComicButton
                    variant="pink"
                    className="flex-1"
                    onClick={() => {
                      setCustomSupabaseConfig(null, null);
                      setOwnProjectOpen(false);
                    }}
                  >
                    Убрать свой
                  </ComicButton>
                )}
                <ComicButton variant="outline" className="flex-1" onClick={() => setOwnProjectOpen(false)}>
                  Отмена
                </ComicButton>
              </div>
              <p className="text-[11px] font-semibold text-ink/40">
                Найти: supabase.com → ваш проект → Settings → API. Не забудьте выполнить{" "}
                <code className="rounded bg-paper px-1">supabase/schema.sql</code> в SQL Editor этого проекта.
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 px-1 font-display text-sm uppercase text-ink/60">Опасная зона</h2>
          {!resetOpen ? (
            <ComicButton variant="pink" className="w-full" onClick={() => setResetOpen(true)}>
              Сбросить все данные
            </ComicButton>
          ) : (
            <div className="space-y-2 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
              <p className="text-xs font-semibold">
                Это сотрёт членов семьи, задачи, баллы и историю <b>на этом устройстве</b>.{" "}
                {familyCode
                  ? "У вас включена синхронизация — данные семьи останутся в облаке, вернуть их можно, снова введя тот же код."
                  : "Синхронизация выключена — эти данные нигде больше не хранятся, восстановить их будет нельзя."}
              </p>
              <p className="text-xs font-bold">
                Чтобы подтвердить, наберите <span className="rounded bg-paper px-1">СБРОСИТЬ</span>:
              </p>
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full rounded-xl border-3 border-ink px-3 py-2 font-semibold outline-none"
                placeholder="СБРОСИТЬ"
              />
              <div className="flex gap-2">
                <ComicButton
                  variant="pink"
                  className="flex-1"
                  disabled={resetConfirmText.trim().toUpperCase() !== "СБРОСИТЬ"}
                  onClick={() => {
                    resetAll();
                    setResetOpen(false);
                    setResetConfirmText("");
                  }}
                >
                  Стереть
                </ComicButton>
                <ComicButton
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResetOpen(false);
                    setResetConfirmText("");
                  }}
                >
                  Отмена
                </ComicButton>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
