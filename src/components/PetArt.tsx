interface PetArtProps {
  className?: string;
}

// Original mascot art for the family (not any copyrighted character) —
// bold, uniform-weight ink outlines and a goofy prime-time-cartoon sense
// of humor (big googly eyes, lolling tongue, smirk), but an original
// silhouette, palette and pose throughout — see FamilyMemberSticker /
// BurstTitle for the app's comic/scrapbook look this matches.

export function DogArt({ className }: PetArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {/* floppy ears, hanging down like a spaniel's */}
      <path
        d="M30 30c-16-2-24 12-20 28 3 12 14 16 18 6 3-8 4-24 2-34Z"
        fill="#FF6F5E"
        stroke="#151313"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M70 30c16-2 24 12 20 28-3 12-14 16-18 6-3-8-4-24-2-34Z"
        fill="#FF6F5E"
        stroke="#151313"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* head */}
      <circle cx="50" cy="46" r="26" fill="#FFCFC7" stroke="#151313" strokeWidth="3" />
      {/* eye patch */}
      <path d="M28 32c6-6 16-6 20 2-8 4-16 4-20-2Z" fill="#FF6F5E" stroke="#151313" strokeWidth="2.5" strokeLinejoin="round" />
      {/* one eyebrow cocked up for a goofy look */}
      <path d="M56 32c3-3 7-3 9-1" stroke="#151313" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* big googly eyes, slightly mismatched size for a silly expression */}
      <circle cx="39" cy="43" r="6" fill="#fff" stroke="#151313" strokeWidth="2.2" />
      <circle cx="38" cy="44" r="3" fill="#151313" />
      <circle cx="63" cy="42" r="7" fill="#fff" stroke="#151313" strokeWidth="2.2" />
      <circle cx="65" cy="43" r="3.4" fill="#151313" />
      {/* snout */}
      <ellipse cx="50" cy="59" rx="13" ry="9" fill="#FFF3E6" stroke="#151313" strokeWidth="3" />
      <ellipse cx="50" cy="55" rx="4.4" ry="3.4" fill="#151313" />
      {/* big open grin with tongue lolling out */}
      <path d="M40 63c4 5 16 5 20 0" stroke="#151313" strokeWidth="2.8" fill="#fff" strokeLinecap="round" />
      <path d="M48 64c1 9 9 10 10 2" fill="#FF3D94" stroke="#151313" strokeWidth="2.5" strokeLinejoin="round" />
      {/* body + paws */}
      <path d="M24 82c0-13 11-17 26-17s26 4 26 17v5H24Z" fill="#FF6F5E" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 87v-8M68 87v-8" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
      {/* wag lines */}
      <path d="M84 70c4 1 6 4 5 8M87 76c4 0 6 3 6 6" stroke="#151313" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Same dog, but unimpressed with you — used to guilt-trip a refused task. */
export function GrumpyDogArt({ className }: PetArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {/* ears pinned back, annoyed */}
      <path
        d="M32 34c-15 2-20 14-14 26 3 6 11 6 14-2 2-8 2-17 0-24Z"
        fill="#FF6F5E"
        stroke="#151313"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M68 34c15 2 20 14 14 26-3 6-11 6-14-2-2-8-2-17 0-24Z"
        fill="#FF6F5E"
        stroke="#151313"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* head */}
      <circle cx="50" cy="46" r="26" fill="#FFCFC7" stroke="#151313" strokeWidth="3" />
      {/* furrowed angry eyebrows */}
      <path d="M32 36c5 3 9 3 13 6M68 36c-5 3-9 3-13 6" stroke="#151313" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      {/* narrowed eyes */}
      <path d="M35 44c3-2 7-2 9 0" stroke="#151313" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M56 44c3-2 7-2 9 0" stroke="#151313" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* snout scrunched into a frown */}
      <ellipse cx="50" cy="60" rx="13" ry="8" fill="#FFF3E6" stroke="#151313" strokeWidth="3" />
      <ellipse cx="50" cy="56" rx="4.4" ry="3.4" fill="#151313" />
      <path d="M40 65c4-3 16-3 20 0" stroke="#151313" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* body + crossed front paws */}
      <path d="M24 84c0-13 11-17 26-17s26 4 26 17v3H24Z" fill="#FF6F5E" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 78c6 4 12 4 18-1" stroke="#151313" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      {/* annoyed motion lines above head */}
      <path d="M22 20l4 5M50 14v6M78 20l-4 5" stroke="#151313" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function CatArt({ className }: PetArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {/* tail with a curl */}
      <path d="M76 82c16-2 20-20 6-28-8-4-4 6 2 8" fill="none" stroke="#151313" strokeWidth="8" strokeLinecap="round" />
      <path d="M76 82c16-2 20-20 6-28-8-4-4 6 2 8" fill="none" stroke="#B79CFF" strokeWidth="5" strokeLinecap="round" />
      {/* ears — one bent for a scruffy, funny look */}
      <path d="M30 32 22 12l16 8Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M68 30c2-8 10-16 16-16-2 8-6 16-10 22Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      {/* head */}
      <circle cx="50" cy="46" r="24" fill="#DCCFFF" stroke="#151313" strokeWidth="3" />
      {/* mischievous smirking eyes */}
      <path d="M33 42c3-5 10-5 12-1-4 4-9 4-12 1Z" fill="#fff" stroke="#151313" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="41" cy="42" r="2.6" fill="#151313" />
      <path d="M56 41c3-5 10-5 12-1-4 4-9 4-12 1Z" fill="#fff" stroke="#151313" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="64" cy="41" r="2.6" fill="#151313" />
      {/* nose + smirking open mouth with a fang */}
      <path d="M50 52 47 56h6Z" fill="#FF3D94" stroke="#151313" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 56c-3 3-7 4-9 2M50 56c4 4 9 3 10-1" stroke="#151313" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M58 59v4" stroke="#151313" strokeWidth="2" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M12 44h17M13 51h16M71 43h17M72 50h16" stroke="#151313" strokeWidth="2" strokeLinecap="round" />
      {/* body + paws */}
      <path d="M27 82c0-14 10-19 23-19s23 5 23 19v4H27Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 86v-6M62 86v-6" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
