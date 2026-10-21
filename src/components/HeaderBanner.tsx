import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  tag?: string;
  color?: "pink" | "yellow" | "sky" | "turquoise" | "rainbow";
  action?: ReactNode;
  className?: string;
}

const BG: Partial<Record<NonNullable<HeaderBannerProps["color"]>, string>> = {
  pink: "bg-pink",
  yellow: "bg-yellow",
  sky: "bg-sky",
  turquoise: "bg-turquoise",
  // "rainbow" has no flat bg class — it's a gradient, applied as an
  // inline style below instead.
};

const TEXT: Record<NonNullable<HeaderBannerProps["color"]>, string> = {
  pink: "text-white",
  yellow: "text-ink",
  sky: "text-ink",
  turquoise: "text-ink",
  rainbow: "text-white",
};

const RAINBOW_GRADIENT =
  "linear-gradient(90deg, #FF3D94, #FFE000, #4CE0A0, #4FC1FF, #B79CFF)";

export function HeaderBanner({ title, tag, color = "pink", action, className }: HeaderBannerProps) {
  const bg = BG[color];
  const text = TEXT[color];

  return (
    <div className={cn("flex items-start justify-between gap-2 px-4 pt-4", className)}>
      <div
        className={cn("rounded-torn border-3 border-ink px-5 py-3 shadow-pop", bg)}
        style={color === "rainbow" ? { backgroundImage: RAINBOW_GRADIENT } : undefined}
      >
        <p
          className={cn("font-display text-2xl uppercase leading-none tracking-tight", text)}
          style={color === "rainbow" ? { textShadow: "0 1px 3px rgba(0,0,0,0.55)" } : undefined}
        >
          {title}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {tag && (
          <span className="-rotate-3 rounded-full border-2 border-ink bg-white px-3 py-1 text-[10px] font-bold uppercase shadow-pop-sm">
            {tag}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
