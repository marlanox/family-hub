"use client";

import { useState } from "react";
import Link from "next/link";
import { ComicButton } from "./ComicButton";
import { Facet, shapeFor } from "./Facet";
import { msgAppealed, notAgree, pointsWord } from "@/lib/grammar";
import { creditedMemberIds } from "@/lib/stats";
import { penaltyJudges, useFamilyStore } from "@/lib/store";
import { relativeTime } from "@/lib/time";
import type { ActivityEvent, Penalty } from "@/lib/types";

// Emoji flattened to black, like the stat chips.
const MONO = { filter: "grayscale(1) brightness(0)" };

const name = (members: { id: string; displayName: string }[], id: string) =>
  members.find((m) => m.id === id)?.displayName ?? "—";

/**
 * "Штраф" for a "готово" entry whose chore wasn't really done: pick how
 * much of its points to take back and say why.
 */
export function PenaltySheet({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const issuePenalty = useFamilyStore((s) => s.issuePenalty);
  const candidates = creditedMemberIds(event, members).filter((id) => id !== whoAmI);
  const [memberId, setMemberId] = useState(candidates[0] ?? "");
  const max = event.points ?? 0;
  const options = Array.from(new Set([Math.max(1, Math.round(max / 4)), Math.max(1, Math.round(max / 2)), max])).filter((n) => n > 0);
  const [points, setPoints] = useState(options[1] ?? options[0] ?? 0);
  const [reason, setReason] = useState("");
  const title = event.message.match(/«(.+?)»/)?.[1] ?? "задача";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Facet shape={2} shadow="md" fillClassName="space-y-4 bg-white px-5 pb-5 pt-8">
          <div>
            <p className="font-display text-lg uppercase leading-tight">
              <span style={MONO}>⚖️</span> Штраф
            </p>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              За «{title}» — если сделано не по-настоящему. Человек сможет не согласиться, тогда решит третий.
            </p>
          </div>

          {candidates.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {candidates.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMemberId(id)}
                  className={`border-3 border-ink px-3 py-1.5 font-display text-xs uppercase ${memberId === id ? "bg-violet" : "bg-white"}`}
                >
                  {name(members, id)}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase text-ink/60">Сколько снять</p>
            <div className="flex gap-2">
              {options.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPoints(n)}
                  className={`flex-1 border-3 border-ink py-2 font-display text-sm ${points === n ? "bg-ink text-white" : "bg-white"}`}
                >
                  −{n}
                  <span className="block text-[9px] font-bold uppercase opacity-70">{n === max ? "всё" : n === options[1] ? "половина" : "четверть"}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase text-ink/60">Что не так</p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={120}
              placeholder="Например: половина учебников на полу"
              className="w-full border-3 border-ink px-3 py-2.5 text-sm font-semibold outline-none"
            />
          </div>

          <div className="flex gap-2">
            <ComicButton variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </ComicButton>
            <ComicButton
              variant="pink"
              className="flex-1"
              disabled={!memberId || !reason.trim() || points <= 0}
              onClick={() => {
                issuePenalty({ memberId, taskId: event.taskId, taskTitle: title, points, reason });
                onClose();
              }}
            >
              Оштрафовать
            </ComicButton>
          </div>
        </Facet>
      </div>
    </div>
  );
}

function statusLabel(p: Penalty): string {
  return p.status === "appealed" ? "обжалуется" : p.status === "upheld" ? "в силе" : p.status === "cancelled" ? "отменён" : "штраф";
}

/** Open fines and appeals, with whatever this person can do about each. */
export function PenaltyPanel() {
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const penalties = useFamilyStore((s) => s.penalties);
  const appealPenalty = useFamilyStore((s) => s.appealPenalty);
  const resolvePenalty = useFamilyStore((s) => s.resolvePenalty);
  const [appealing, setAppealing] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");

  const open = penalties.filter((p) => p.status === "active" || p.status === "appealed");
  if (open.length === 0) return null;

  return (
    <section className="space-y-2.5 landscape:col-span-2">
      <h2 className="px-1 font-display text-lg uppercase">
        <span style={MONO}>⚖️</span> Штрафы и споры
      </h2>
      {open.map((p) => {
        const judges = penaltyJudges(p, members);
        const iAmFined = whoAmI === p.memberId;
        const iIssued = whoAmI === p.issuedBy;
        const iJudge = p.status === "appealed" && !!whoAmI && judges.includes(whoAmI);
        return (
          <Facet key={p.id} shape={shapeFor(p.id)} fillClassName="space-y-2 bg-white px-4 py-3">
            <div className="flex items-start gap-3">
              <Facet kind="gem" shape={shapeFor(p.id) + 1} shadow="none" className="h-9 w-9 shrink-0" fillClassName="stripes-bw flex items-center justify-center">
                <span className="bg-white px-0.5 text-sm">
                  <span style={MONO}>⚖️</span>
                </span>
              </Facet>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">
                  {name(members, p.memberId)}: −{p.points} {pointsWord(p.points)} за «{p.taskTitle}»
                </p>
                <p className="text-xs font-semibold text-ink/60">
                  Причина: {p.reason} · {name(members, p.issuedBy)} · {relativeTime(p.createdAt)}
                </p>
                {p.status === "appealed" && (
                  <p className="mt-0.5 text-xs font-semibold text-ink/60">
                    {name(members, p.memberId)} {notAgree(name(members, p.memberId))}
                    {p.appealText ? `: ${p.appealText}` : ""} · решает {judges.map((id) => name(members, id)).join(" или ")}
                  </p>
                )}
              </div>
              <Facet shape={shapeFor(p.id) + 2} shadow="none" fillClassName={p.status === "appealed" ? "bg-violet px-2 py-1" : "bg-ink px-2 py-1 text-white"}>
                <span className="font-display text-[10px] uppercase">{statusLabel(p)}</span>
              </Facet>
            </div>

            {iAmFined && p.status === "active" && appealing !== p.id && (
              <ComicButton variant="sky" className="w-full" onClick={() => { setAppealing(p.id); setAppealText(""); }}>
                {notAgree(name(members, p.memberId)) === "против" ? "Обжаловать" : `${notAgree(name(members, p.memberId)).replace("не", "Не")}`}
              </ComicButton>
            )}
            {appealing === p.id && (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  maxLength={160}
                  placeholder="Почему? Например: всё убрано, проверь ещё раз"
                  className="w-full border-3 border-ink px-3 py-2 text-sm font-semibold outline-none"
                />
                <div className="flex gap-2">
                  <ComicButton variant="outline" className="flex-1" onClick={() => setAppealing(null)}>
                    Отмена
                  </ComicButton>
                  <ComicButton variant="sky" className="flex-1" onClick={() => { appealPenalty(p.id, appealText); setAppealing(null); }}>
                    Обжаловать
                  </ComicButton>
                </div>
              </div>
            )}
            {iJudge && (
              <div className="flex gap-2">
                <ComicButton variant="ink" className="flex-1" onClick={() => resolvePenalty(p.id, false)}>
                  Штраф в силе
                </ComicButton>
                <ComicButton variant="mint" className="flex-1" onClick={() => resolvePenalty(p.id, true)}>
                  Отменить штраф
                </ComicButton>
              </div>
            )}
            {iIssued && !iJudge && (
              <button
                type="button"
                onClick={() => confirm(`Снять штраф? ${name(members, p.memberId)} вернутся ${p.points} ${pointsWord(p.points)}.`) && resolvePenalty(p.id, true)}
                className="text-xs font-bold uppercase text-ink/60 underline underline-offset-2"
              >
                Снять штраф (доделано)
              </button>
            )}
          </Facet>
        );
      })}
    </section>
  );
}

/** On Home, only when a fine needs this person: appeal theirs, or decide someone's appeal. */
export function PenaltyBanner() {
  const members = useFamilyStore((s) => s.members);
  const whoAmI = useFamilyStore((s) => s.whoAmI);
  const penalties = useFamilyStore((s) => s.penalties);
  if (!whoAmI) return null;
  const mine = penalties.find((p) => p.memberId === whoAmI && p.status === "active");
  const toJudge = penalties.find((p) => p.status === "appealed" && penaltyJudges(p, members).includes(whoAmI));
  const p = toJudge ?? mine;
  if (!p) return null;
  const myWord = notAgree(name(members, whoAmI));
  const text = toJudge
    ? `Рассуди спор: ${msgAppealed(name(members, p.memberId), p.taskTitle)}`
    : `Тебе штраф −${p.points} за «${p.taskTitle}».${myWord === "против" ? " Можно обжаловать" : ` ${myWord.replace("не", "Не")}? Можно обжаловать`}`;
  return (
    <Link href="/activity" className="block">
      <Facet shape={4} fillClassName="flex items-center gap-3 bg-white px-4 py-3">
        <Facet kind="gem" shape={2} shadow="none" className="h-9 w-9 shrink-0" fillClassName="stripes-bw flex items-center justify-center">
          <span className="bg-white px-0.5 text-sm">
                  <span style={MONO}>⚖️</span>
                </span>
        </Facet>
        <p className="flex-1 text-sm font-semibold leading-snug">{text}</p>
        <span aria-hidden className="font-display">→</span>
      </Facet>
    </Link>
  );
}
