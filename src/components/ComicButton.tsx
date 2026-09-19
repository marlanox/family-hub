import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "mint" | "pink" | "sky" | "yellow" | "ink" | "outline";

interface ComicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
}

const variantClasses: Record<Variant, string> = {
  mint: "bg-mint text-ink",
  pink: "bg-pink text-white",
  sky: "bg-sky text-ink",
  yellow: "bg-yellow text-ink",
  ink: "bg-ink text-white",
  outline: "bg-paper text-ink",
};

export function ComicButton({
  variant = "mint",
  size = "md",
  className,
  children,
  ...props
}: ComicButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border-3 border-ink font-display uppercase tracking-wide shadow-pop transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-sm disabled:opacity-50",
        size === "lg" ? "px-6 py-4 text-base" : "px-4 py-2.5 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
