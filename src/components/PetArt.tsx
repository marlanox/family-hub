"use client";

import { useId } from "react";

interface PetArtProps {
  className?: string;
}

// Original mascot art for the family (not any copyrighted character's
// design) — bold uniform-weight ink outlines, gradient "glossy toy"
// shading for a pseudo-3D pop, and a cocky prime-time-cartoon attitude.
// See FamilyMemberSticker / BurstTitle for the app's comic look this
// still has to sit alongside.

/** Shared glossy-toy shading: a diagonal gradient fill + a soft highlight streak + a drop shadow, so flat SVG shapes read as glossy 3D plastic. */
function useToyShading(prefix: string, from: string, to: string) {
  const uid = useId().replace(/[:]/g, "");
  const gradId = `${prefix}-grad-${uid}`;
  const shadowId = `${prefix}-shadow-${uid}`;
  return {
    gradId,
    shadowId,
    defs: (
      <defs>
        <linearGradient id={gradId} x1="15%" y1="10%" x2="85%" y2="95%">
          <stop offset="0%" stopColor={to} />
          <stop offset="100%" stopColor={from} />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
    ),
  };
}

/** Tough purple street dog — shades, spiked collar, crossed arms, smug fanged smirk. */
export function DogArt({ className }: PetArtProps) {
  const { gradId, shadowId, defs } = useToyShading("dog", "#6B3FA0", "#B79CFF");
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {defs}
      <g filter={`url(#${shadowId})`}>
        {/* small alert ears, not floppy — reads tougher */}
        <path d="M26 28 14 8l18 10Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        <path d="M74 28 86 8 68 18Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        {/* stocky head */}
        <path
          d="M50 18c17 0 28 12 28 27 0 11-6 18-9 22H31c-3-4-9-11-9-22 0-15 11-27 28-27Z"
          fill={`url(#${gradId})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* glossy highlight streak */}
        <path d="M32 28c4-6 12-10 18-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.35" fill="none" />
        {/* sunglasses — flat black, one glossy streak, hides the eyes for attitude */}
        <path
          d="M27 44h18c1 0 2 1 2 3 0 5-4 8-9 8s-9-3-9-8c0-2 1-3 2-3Z"
          fill="#151313"
        />
        <path
          d="M53 44h18c1 0 2 1 2 3 0 5-4 8-9 8s-9-3-9-8c0-2 1-3 2-3Z"
          fill="#151313"
        />
        <path d="M45 46h8" stroke="#151313" strokeWidth="3" />
        <path d="M31 47c2-1 4-1 5 0M57 47c2-1 4-1 5 0" stroke="#fff" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        {/* smug open smirk with one fang */}
        <path d="M42 62c4 4 12 4 15-1" stroke="#151313" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M45 63l1 5 3-4Z" fill="#fff" stroke="#151313" strokeWidth="1.4" strokeLinejoin="round" />
        {/* thick neck + spiked collar */}
        <path d="M36 65h28v8H36Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" />
        <path d="M34 71h32v6H34Z" fill="#151313" />
        <circle cx="40" cy="74" r="2" fill="#DCCFFF" />
        <circle cx="50" cy="74" r="2" fill="#DCCFFF" />
        <circle cx="60" cy="74" r="2" fill="#DCCFFF" />
        {/* stocky body */}
        <path
          d="M24 108c-1-16 10-24 26-24s27 8 26 24Z"
          fill={`url(#${gradId})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* crossed arms */}
        <path d="M30 92c8 6 16 6 24 0M70 92c-8 6-16 6-24 0" stroke="#151313" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Same tough dog, mid-rant — shades off, full snarl, furious brow. */
export function GrumpyDogArt({ className }: PetArtProps) {
  const { gradId, shadowId, defs } = useToyShading("grdog", "#6B3FA0", "#B79CFF");
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {defs}
      <g filter={`url(#${shadowId})`}>
        <path d="M26 28 14 8l18 10Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        <path d="M74 28 86 8 68 18Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        <path
          d="M50 18c17 0 28 12 28 27 0 11-6 18-9 22H31c-3-4-9-11-9-22 0-15 11-27 28-27Z"
          fill={`url(#${gradId})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* furious brow */}
        <path d="M30 40c6 4 10 4 15 8M70 40c-6 4-10 4-15 8" stroke="#151313" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        {/* narrowed angry eyes */}
        <path d="M33 50c3-2 7-2 9 0" stroke="#151313" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M58 50c3-2 7-2 9 0" stroke="#151313" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        {/* full snarl, teeth bared */}
        <path d="M38 62c5 6 19 6 24 0" stroke="#151313" strokeWidth="3" fill="#fff" strokeLinecap="round" />
        <path d="M43 63l6 5 6-5Z" fill="#fff" stroke="#151313" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M36 65h28v8H36Z" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="3" />
        <path d="M34 71h32v6H34Z" fill="#151313" />
        <circle cx="40" cy="74" r="2" fill="#DCCFFF" />
        <circle cx="50" cy="74" r="2" fill="#DCCFFF" />
        <circle cx="60" cy="74" r="2" fill="#DCCFFF" />
        <path
          d="M24 108c-1-16 10-24 26-24s27 8 26 24Z"
          fill={`url(#${gradId})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M30 92c8 6 16 6 24 0M70 92c-8 6-16 6-24 0" stroke="#151313" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* fury lines */}
        <path d="M16 16l5 5M84 16l-5 5M50 4v7" stroke="#151313" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * "Макака" — the family's real Siamese cat. Cream coat with seal-brown
 * points, blue eyes, plays the meek victim... but bites. One extended
 * claw and a hidden fang are the tell.
 */
export function CatArt({ className }: PetArtProps) {
  const { gradId: creamGrad, shadowId, defs } = useToyShading("cat", "#D9B98A", "#F3E3C6");
  const pointId = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {defs}
      <defs>
        <linearGradient id={`cat-point-${pointId}`} x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#4A362A" />
          <stop offset="100%" stopColor="#2B1E17" />
        </linearGradient>
      </defs>
      <g filter={`url(#${shadowId})`}>
        {/* tail, cream with a dark seal tip, swept up in one smooth curl */}
        <path d="M70 98C90 92 97 72 82 62" fill="none" stroke="#151313" strokeWidth="9" strokeLinecap="round" />
        <path d="M70 98C90 92 97 72 82 62" fill="none" stroke={`url(#${creamGrad})`} strokeWidth="6" strokeLinecap="round" />
        <path d="M89 74C93 70 93 66 88 63" fill="none" stroke={`url(#cat-point-${pointId})`} strokeWidth="6.5" strokeLinecap="round" />
        {/* dark seal-point ears */}
        <path d="M28 30 18 8l18 10Z" fill={`url(#cat-point-${pointId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        <path d="M72 30 82 8 64 18Z" fill={`url(#cat-point-${pointId})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        {/* cream head */}
        <circle cx="50" cy="44" r="26" fill={`url(#${creamGrad})`} stroke="#151313" strokeWidth="3.5" />
        {/* highlight streak */}
        <path d="M32 30c4-6 12-9 18-9" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.4" fill="none" />
        {/* seal face mask */}
        <path
          d="M50 34c9 0 15 6 15 14 0 7-6 12-15 12s-15-5-15-12c0-8 6-14 15-14Z"
          fill={`url(#cat-point-${pointId})`}
        />
        {/* big innocent blue eyes */}
        <ellipse cx="43" cy="45" rx="5.4" ry="6.2" fill="#5FD3FF" stroke="#151313" strokeWidth="2" />
        <circle cx="43" cy="46" r="2.4" fill="#151313" />
        <circle cx="41.5" cy="43.5" r="1" fill="#fff" />
        <ellipse cx="59" cy="45" rx="5.4" ry="6.2" fill="#5FD3FF" stroke="#151313" strokeWidth="2" />
        <circle cx="59" cy="46" r="2.4" fill="#151313" />
        <circle cx="57.5" cy="43.5" r="1" fill="#fff" />
        {/* sweet closed-mouth smile, with one fang sneaking out */}
        <path d="M46 55c2 2 6 2 8 0" stroke="#151313" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M53 55l1.5 4 2-3.5Z" fill="#fff" stroke="#151313" strokeWidth="1.2" strokeLinejoin="round" />
        {/* whiskers */}
        <path d="M10 44h16M11 50h15M74 44h16M75 50h15" stroke="#151313" strokeWidth="2" strokeLinecap="round" />
        {/* cream body */}
        <path
          d="M25 106c-1-15 10-23 25-23s26 8 25 23Z"
          fill={`url(#${creamGrad})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* one raised seal-point paw, claws out — the "but bites" tell */}
        <path d="M60 90c3-6 9-8 14-6" fill={`url(#cat-point-${pointId})`} stroke="#151313" strokeWidth="3" strokeLinecap="round" />
        <path d="M74 82l3-3M76 85l3-2M76 88l3 0" stroke="#151313" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M38 96v-6" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
