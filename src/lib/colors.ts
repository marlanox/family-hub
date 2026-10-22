import type { FamilyMember } from "./types";

type Accent = FamilyMember["accentColor"];

interface AccentClasses {
  bg: string;
  bgSoft: string;
  ring: string;
  text: string;
}

export const accentMap: Record<Accent, AccentClasses> = {
  pink: { bg: "bg-pink", bgSoft: "bg-pink-soft", ring: "ring-pink", text: "text-pink-deep" },
  lilac: { bg: "bg-lilac", bgSoft: "bg-lilac-soft", ring: "ring-lilac", text: "text-ink" },
  sky: { bg: "bg-sky", bgSoft: "bg-sky-soft", ring: "ring-sky", text: "text-ink" },
  mint: { bg: "bg-mint", bgSoft: "bg-mint-soft", ring: "ring-mint", text: "text-ink" },
  yellow: { bg: "bg-yellow", bgSoft: "bg-yellow-soft", ring: "ring-yellow", text: "text-ink" },
  coral: { bg: "bg-coral", bgSoft: "bg-coral-soft", ring: "ring-coral", text: "text-ink" },
  violet: { bg: "bg-violet", bgSoft: "bg-violet-soft", ring: "ring-violet", text: "text-ink" },
  // "glitter-gold" (globals.css) is a gold background with scattered
  // sparkle dots baked in — used anywhere the flat bg would normally
  // go, so every gold swatch/icon tile is glittery, not just one spot.
  gold: { bg: "glitter-gold", bgSoft: "bg-gold-soft", ring: "ring-gold", text: "text-ink" },
};

interface TaskTile {
  bg: string;
  /** Card background when a task row is shown "solid" (Plan page). */
  soft: string;
  icon: string;
  /** Busy patterns get a small white plate behind the icon so it stays legible. */
  plate?: boolean;
}

// Task icon tiles get their own palette, separate from member stickers:
// soft lavender instead of pink, plus gold glitter, silver glitter, acid
// lemon, black-with-white-icon and b/w stripes — and no blue. Mapped at
// render time so tasks already saved with the old color keys change too,
// without a data migration.
export const taskTile: Record<Accent, TaskTile> = {
  pink: { bg: "bg-violet", soft: "bg-violet-soft", icon: "text-ink" },
  violet: { bg: "bg-violet", soft: "bg-violet-soft", icon: "text-ink" },
  yellow: { bg: "glitter-gold", soft: "bg-gold-soft", icon: "text-ink" },
  gold: { bg: "glitter-gold", soft: "bg-gold-soft", icon: "text-ink" },
  lilac: { bg: "glitter-silver", soft: "bg-silver-soft", icon: "text-ink" },
  mint: { bg: "bg-lemon", soft: "bg-lemon-soft", icon: "text-ink" },
  sky: { bg: "bg-ink", soft: "bg-white", icon: "text-white" },
  coral: { bg: "stripes-bw", soft: "bg-white", icon: "text-ink", plate: true },
};
