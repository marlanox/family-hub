import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  tag?: string;
  color?: "pink" | "yellow" | "sky" | "turquoise";
  action?: ReactNode;
  className?: string;
}

const BG: Record<NonNullable<HeaderBannerProps["color"]>, string> = {
  pink: "bg-pink",
  yellow: "bg-yellow",
  sky: "bg-sky",
  turquoise: "bg-turquoise",
};

const TEXT: Record<NonNullable<HeaderBannerProps["color"]>, string> = {
  pink: "text-white",
  yellow: "text-ink",
  sky: "text-ink",
  turquoise: "text-ink",
};

export function HeaderBanner({ title, tag, color = "pink", action, className }: HeaderBannerProps) {
  const bg = BG[color];
  const text = TEXT[color];

  return (
    <div className={cn("flex items-start justify-between gap-2 px-4 pt-4", className)}>
      <div className={cn("rounded-torn border-3 border-ink px-5 py-3 shadow-pop", bg)}>
        <p className={cn("font-display text-2xl uppercase leading-none tracking-tight", text)}>
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
