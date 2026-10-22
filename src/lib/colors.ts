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

// Task icon tiles get their own, louder palette than member stickers:
// former pink tiles go pale violet, the rest gold glitter or neon. Mapped
// at render time so tasks already saved with the old colors change too,
// without a data migration.
export const taskTileBg: Record<Accent, string> = {
  pink: "bg-violet",
  violet: "bg-violet",
  yellow: "glitter-gold",
  lilac: "glitter-gold",
  gold: "glitter-gold",
  mint: "bg-acid",
  sky: "bg-turquoise",
  coral: "bg-coral",
};
