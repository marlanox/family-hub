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
};
