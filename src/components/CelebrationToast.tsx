"use client";

import { useEffect, useMemo } from "react";
import { useFamilyStore } from "@/lib/store";
import { Icon } from "./Icon";

const CONFETTI_COLORS = ["#FF3D94", "#FFE000", "#B79CFF", "#4FC1FF", "#4CE0A0", "#FF6F5E"];

export function CelebrationToast() {
  const celebration = useFamilyStore((s) => s.lastCelebration);
  const dismiss = useFamilyStore((s) => s.dismissCelebration);

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [celebration, dismiss]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 200),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.round(Math.random() * 360),
      })),
    [celebration?.key],
  );

  if (!celebration) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {confetti.map((c, i) => (
        <span
          key={i}
          className="absolute top-[-10px] h-2.5 w-2.5 animate-[confetti-fall_1.4s_ease-in_forwards] rounded-sm"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            animationDelay: `${c.delay}ms`,
            transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}

      <div className="animate-pop-in pointer-events-auto mx-6 mt-16 flex max-w-xs items-start gap-3 rounded-sticker border-3 border-ink bg-white p-4 shadow-pop">
        <span className="text-3xl leading-none">{celebration.emoji}</span>
        <div className="flex-1">
          <p className="font-display text-sm leading-tight">{celebration.title}</p>
          <p className="mt-1 text-xs font-semibold text-ink/60">{celebration.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Закрыть"
          className="rounded-full border-2 border-ink p-1"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(70vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
