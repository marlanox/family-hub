import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";
import { FacetOutline, facetClipPath, shapeFor } from "./Facet";

type Variant = "mint" | "pink" | "sky" | "yellow" | "ink" | "outline";

interface ComicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
}

const variantClasses: Record<Variant, string> = {
  // Variant names are historical; colours follow the current palette
  // (acid lime / lavender / lemon — no sea-green or sky-blue left).
  mint: "bg-lime text-ink",
  pink: "bg-pink text-white",
  sky: "bg-violet text-ink",
  yellow: "bg-lemon text-ink",
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
  // Faceted like every other plaque: clip-path for the cut-stone shape, an
  // SVG outline for the ink border (a CSS border can't follow a clip-path).
  const shape = shapeFor(typeof children === "string" ? children : variant + size);
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 font-display uppercase tracking-wide transition-transform active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50",
        size === "lg" ? "px-7 py-4 text-base" : "px-5 py-2.5 text-sm",
        variantClasses[variant],
        className,
      )}
      style={{ clipPath: facetClipPath(shape) }}
      {...props}
    >
      {children}
      <FacetOutline shape={shape} />
    </button>
  );
}
