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

/**
 * Streetwear capybara — the chill internet-favourite mascot: black
 * hoodie with white drawstrings, gold chain, black shades, and the
 * classic citrus balanced on its head (acid lemon, to match the app).
 */
export function CapybaraArt({ className }: PetArtProps) {
  const { gradId, shadowId, defs } = useToyShading("capy", "#8A5A2B", "#C99761");
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {defs}
      <defs>
        <linearGradient id={`capy-hoodie-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34303b" />
          <stop offset="100%" stopColor="#0c0b0e" />
        </linearGradient>
        <linearGradient id={`capy-gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1A8" />
          <stop offset="45%" stopColor="#FFD23D" />
          <stop offset="100%" stopColor="#B07A12" />
        </linearGradient>
      </defs>
      <g filter={`url(#${shadowId})`}>
        {/* hood up behind the head */}
        <path d="M17 74C13 36 30 22 50 22s37 14 33 52Z" fill={`url(#capy-hoodie-${uid})`} stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
        {/* little round ears */}
        <circle cx="31" cy="25" r="5" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="2.5" />
        <circle cx="69" cy="25" r="5" fill={`url(#${gradId})`} stroke="#151313" strokeWidth="2.5" />
        {/* boxy capybara head */}
        <path
          d="M28 33c0-9 6-13 13-13h18c7 0 13 4 13 13l2 24c0 9-9 12-24 12S26 66 26 57Z"
          fill={`url(#${gradId})`}
          stroke="#151313"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M33 27c4-3 9-4 14-4" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" fill="none" />
        {/* black shades with a glint */}
        <path d="M30 37h17v5c0 4-3 6-8 6s-9-2-9-6Z" fill="#151313" />
        <path d="M53 37h17v5c0 4-4 6-9 6s-8-2-8-6Z" fill="#151313" />
        <path d="M47 39h6" stroke="#151313" strokeWidth="2.5" />
        <path d="M33 40l4-2M56 40l4-2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        {/* big blunt muzzle with nostrils and a tiny content smile */}
        <ellipse cx="50" cy="58" rx="15" ry="8.5" fill="#7A4E26" stroke="#151313" strokeWidth="2.5" />
        <ellipse cx="45" cy="56.5" rx="2" ry="1.5" fill="#151313" />
        <ellipse cx="55" cy="56.5" rx="2" ry="1.5" fill="#151313" />
        <path d="M46 62c2 1.5 6 1.5 8 0" stroke="#151313" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* acid-lemon balanced on top, with a leaf */}
        <ellipse cx="50" cy="13" rx="9.5" ry="7" fill="#E6FF00" stroke="#151313" strokeWidth="2.5" />
        <path d="M44 11c2-2 5-3 7-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" fill="none" />
        <path d="M51 6c3-5 8-5 10-3-2 3-6 4-10 3Z" fill="#4CE0A0" stroke="#151313" strokeWidth="1.8" strokeLinejoin="round" />
        {/* hoodie body */}
        <path d="M18 108c0-23 14-35 32-35s32 12 32 35Z" fill={`url(#capy-hoodie-${uid})`} stroke="#151313" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M37 98h26v10" stroke="#46404f" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {/* white drawstrings */}
        <path d="M44 74l-2 15M56 74l2 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="42" cy="90" r="1.6" fill="#fff" />
        <circle cx="58" cy="90" r="1.6" fill="#fff" />
        {/* gold chain + pendant */}
        <path d="M33 77Q50 97 67 77" stroke={`url(#capy-gold-${uid})`} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeDasharray="3.2 1.4" />
        <circle cx="50" cy="91" r="5" fill={`url(#capy-gold-${uid})`} stroke="#151313" strokeWidth="2" />
        <path d="M50 88l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3Z" fill="#fff" opacity="0.85" />
      </g>
    </svg>
  );
}

/**
 * Full-rage mode for the refusal screen — a much bigger, angrier
 * animal than the chill mascots: dark blood-red, hackles up, jaw wide
 * open with a full set of teeth, bloodshot eyes. Meant to read as a
 * genuine "oh no" moment, not a cute mascot.
 */
export function GrumpyDogArt({ className }: PetArtProps) {
  const { gradId, shadowId, defs } = useToyShading("grdog", "#6E0B0B", "#D4342C");
  return (
    <svg viewBox="0 0 120 130" className={className} aria-hidden="true">
      {defs}
      <g filter={`url(#${shadowId})`}>
        {/* hackles — jagged fur standing up behind the head */}
        <path
          d="M30 30 22 10l10 9 4-16 7 15 6-18 7 17 7-14 3 17 9-11-3 18"
          fill={`url(#${gradId})`}
          stroke="#120404"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* big pinned-back ears */}
        <path d="M24 38 6 16l22 8Z" fill={`url(#${gradId})`} stroke="#120404" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M96 38 114 16 92 24Z" fill={`url(#${gradId})`} stroke="#120404" strokeWidth="3.5" strokeLinejoin="round" />
        {/* big blocky enraged head */}
        <path
          d="M60 22c21 0 34 14 34 32 0 13-7 21-11 26H37c-4-5-11-13-11-26 0-18 13-32 34-32Z"
          fill={`url(#${gradId})`}
          stroke="#120404"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* heavy furious brow, pressed down hard */}
        <path
          d="M32 46c8 6 14 6 20 11M88 46c-8 6-14 6-20 11"
          stroke="#120404"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        {/* bloodshot bulging eyes */}
        <circle cx="42" cy="58" r="7" fill="#FFE2D8" stroke="#120404" strokeWidth="2.6" />
        <circle cx="43" cy="59" r="3.4" fill="#120404" />
        <path d="M36 56l3 2M38 53l2 3" stroke="#D4342C" strokeWidth="1" opacity="0.8" />
        <circle cx="78" cy="58" r="7" fill="#FFE2D8" stroke="#120404" strokeWidth="2.6" />
        <circle cx="77" cy="59" r="3.4" fill="#120404" />
        <path d="M84 56l-3 2M82 53l-2 3" stroke="#D4342C" strokeWidth="1" opacity="0.8" />
        {/* jaw dropped wide open, full set of bared teeth top and bottom, red interior */}
        <path
          d="M38 72c2 14 10 22 22 22s20-8 22-22c-8 5-15 7-22 7s-14-2-22-7Z"
          fill="#4A0404"
          stroke="#120404"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M40 74l4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M42 92l4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {/* thick furious neck */}
        <path d="M40 92h40v11H40Z" fill={`url(#${gradId})`} stroke="#120404" strokeWidth="3.5" />
        {/* huge hunched shoulders, leaning forward */}
        <path
          d="M18 128c0-20 14-30 42-30s42 10 42 30Z"
          fill={`url(#${gradId})`}
          stroke="#120404"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* clenched fists instead of crossed arms — ready to go */}
        <circle cx="26" cy="116" r="9" fill={`url(#${gradId})`} stroke="#120404" strokeWidth="3" />
        <circle cx="94" cy="116" r="9" fill={`url(#${gradId})`} stroke="#120404" strokeWidth="3" />
        {/* fury lines + a drop of spit for good measure */}
        <path d="M4 24l7 7M116 24l-7 7M60 4v10" stroke="#120404" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M58 94q-2 6 0 10" stroke="#9FE3FF" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
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
        <linearGradient id={`cat-cape-${pointId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2e2a35" />
          <stop offset="55%" stopColor="#151317" />
          <stop offset="100%" stopColor="#000" />
        </linearGradient>
      </defs>
      <g filter={`url(#${shadowId})`}>
        {/* Batman cape, behind everything: anchored at the neck, billowing
            out wide with a scalloped bat-wing hem, the left side swept lower
            and further out as if caught mid-flight */}
        <path
          d="M38 68C26 70 12 80 1 101Q8 94 14 102Q20 95 27 103Q34 96 41 104L59 104Q66 96 73 103Q80 95 86 102Q92 94 99 98C93 84 79 72 62 68Z"
          fill={`url(#cat-cape-${pointId})`}
          stroke="#151313"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M28 77C22 84 16 92 13 100M40 74C36 82 34 92 33 101M64 75C68 83 70 92 71 100M76 78C82 84 86 92 88 99"
          stroke="#46404f"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* pointed collar standing up behind the head */}
        <path d="M33 66 22 53l14 7ZM67 66l11-13-14 7Z" fill="#151317" stroke="#151313" strokeWidth="2.5" strokeLinejoin="round" />
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
        {/* gold cape clasp at the throat */}
        <circle cx="50" cy="73" r="3.8" fill="#FFD23D" stroke="#151313" strokeWidth="2" />
      </g>
    </svg>
  );
}
