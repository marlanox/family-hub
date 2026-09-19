import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

interface StickerProps extends HTMLAttributes<HTMLDivElement> {
  tilt?: "none" | "left" | "right";
}

export function Sticker({ tilt = "none", className, children, ...props }: StickerProps) {
  return (
    <div
      className={cn(
        "rounded-sticker border-3 border-ink bg-white shadow-pop",
        tilt === "left" && "-rotate-1",
        tilt === "right" && "rotate-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
