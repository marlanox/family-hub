interface PetArtProps {
  className?: string;
}

// Original mascot art for the family (not any copyrighted character) —
// bold ink outlines and flat fills to match the app's comic/scrapbook
// look (see FamilyMemberSticker, BurstTitle). Used on the Rewards page
// as "even the pets are cheering for you" decoration.

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
      <path d="M30 34c6-6 16-6 20 2-8 4-16 4-20-2Z" fill="#FF6F5E" stroke="#151313" strokeWidth="2.5" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="40" cy="44" r="3.4" fill="#151313" />
      <circle cx="61" cy="44" r="3.4" fill="#151313" />
      {/* snout */}
      <ellipse cx="50" cy="58" rx="12" ry="9" fill="#FFF3E6" stroke="#151313" strokeWidth="3" />
      <ellipse cx="50" cy="54" rx="4.2" ry="3.2" fill="#151313" />
      {/* tongue */}
      <path d="M46 63c1 6 7 6 8 0" fill="#FF3D94" stroke="#151313" strokeWidth="2.5" strokeLinecap="round" />
      {/* body + paws */}
      <path d="M26 78c0-12 10-16 24-16s24 4 24 16v6H26Z" fill="#FF6F5E" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M33 84v-8M67 84v-8" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CatArt({ className }: PetArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {/* tail */}
      <path d="M76 80c14-2 18-18 8-26" fill="none" stroke="#151313" strokeWidth="8" strokeLinecap="round" />
      <path d="M76 80c14-2 18-18 8-26" fill="none" stroke="#B79CFF" strokeWidth="5" strokeLinecap="round" />
      {/* ears */}
      <path d="M30 32 22 12l16 8Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M70 32l8-20-16 8Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      {/* head */}
      <circle cx="50" cy="46" r="24" fill="#DCCFFF" stroke="#151313" strokeWidth="3" />
      {/* eyes (happy, closed) */}
      <path d="M36 44c3-4 8-4 10 0" fill="none" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
      <path d="M54 44c3-4 8-4 10 0" fill="none" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
      {/* nose + mouth */}
      <path d="M50 52 47 56h6Z" fill="#FF3D94" stroke="#151313" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 56c-3 3-6 3-8 1M50 56c3 3 6 3 8 1" stroke="#151313" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M14 46h16M14 52h15M70 46h16M71 52h15" stroke="#151313" strokeWidth="2" strokeLinecap="round" />
      {/* body + paws */}
      <path d="M28 80c0-13 10-18 22-18s22 5 22 18v4H28Z" fill="#B79CFF" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 84v-6M62 84v-6" stroke="#151313" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
