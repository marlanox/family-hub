import { cn } from "@/lib/cn";
import type { CSSProperties, ReactNode } from "react";

type Pt = [number, number];

// Hand-cut, slightly lopsided polygons (percent coordinates) — "cut stone"
// plaques instead of rounded rectangles. Cards get shallow corner cuts so
// content never gets clipped; gems (avatars, icon tiles) get deeper ones.
const CARD: Pt[][] = [
  [[3, 0], [96, 4], [100, 26], [98, 82], [93, 100], [5, 96], [0, 74], [1, 18]],
  [[0, 10], [8, 0], [91, 2], [100, 14], [97, 90], [88, 100], [11, 97], [2, 86]],
  [[6, 4], [94, 0], [100, 32], [96, 100], [28, 97], [3, 100], [0, 58], [2, 20]],
  [[0, 0], [89, 5], [100, 20], [99, 96], [15, 100], [4, 85], [1, 42], [4, 9]],
  [[4, 6], [50, 0], [97, 3], [100, 70], [94, 100], [40, 96], [2, 100], [0, 30]],
  [[1, 15], [12, 1], [86, 0], [99, 9], [100, 78], [90, 96], [8, 100], [0, 88]],
];

const GEM: Pt[][] = [
  [[22, 0], [80, 4], [100, 30], [94, 82], [70, 100], [18, 96], [0, 70], [4, 22]],
  [[10, 8], [60, 0], [96, 18], [100, 64], [78, 100], [24, 94], [0, 58], [2, 30]],
  [[30, 2], [88, 10], [100, 48], [86, 92], [40, 100], [6, 84], [0, 36]],
  [[16, 4], [74, 0], [100, 22], [97, 74], [82, 100], [12, 94], [0, 52]],
];

/** Stable small integer from a string, so the same item always gets the same shape. */
export function shapeFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick(set: Pt[][], i: number): Pt[] {
  return set[((i % set.length) + set.length) % set.length]!;
}

export function facetClipPath(shape: number, kind: "card" | "gem" = "card"): string {
  return `polygon(${pick(kind === "gem" ? GEM : CARD, shape).map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}

/**
 * The outline is an SVG with a non-scaling stroke drawn on the same
 * polygon: 6px centred on the edge, the outer half clipped away, leaving
 * an even 3px ink border at any size — a CSS border can't follow a
 * clip-path. The pop shadow comes from a drop-shadow filter on the outer
 * wrapper, which (unlike box-shadow) follows the clipped shape.
 */
export function FacetOutline({ shape, kind = "card", width = 6 }: { shape: number; kind?: "card" | "gem"; width?: number }) {
  const points = pick(kind === "gem" ? GEM : CARD, shape)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={points} fill="none" stroke="#151313" strokeWidth={width} vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
    </svg>
  );
}

interface FacetProps {
  shape?: number;
  kind?: "card" | "gem";
  shadow?: "none" | "sm" | "md";
  /** Layout classes for the outer wrapper (size, margins, rotation, …). */
  className?: string;
  /** Fill + inner layout classes (background, padding, flex, …). */
  fillClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Facet({ shape = 0, kind = "card", shadow = "sm", className, fillClassName, style, children }: FacetProps) {
  return (
    <div
      className={cn(shadow === "md" ? "facet-shadow" : shadow === "sm" ? "facet-shadow-sm" : "", className)}
      style={style}
    >
      <div className={cn("relative h-full w-full", fillClassName)} style={{ clipPath: facetClipPath(shape, kind) }}>
        {children}
        <FacetOutline shape={shape} kind={kind} />
      </div>
    </div>
  );
}
