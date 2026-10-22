import { useId, type ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  action?: ReactNode;
}

// Home title on a glossy rubber splat: an irregular blob with drips
// running off the bottom and a few splatter drops around it, lavender
// with a wet-look highlight. Stretched to fit the text, so it's drawn
// with preserveAspectRatio="none" — a slightly squashed splat still reads.
export function HeaderBanner({ title, action }: HeaderBannerProps) {
  const uid = useId().replace(/[:]/g, "");

  return (
    <div className="flex items-start justify-between gap-2 px-4 pt-4">
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 300 160"
          preserveAspectRatio="none"
          className="absolute -inset-x-2 -top-2 h-[calc(100%+1.25rem)] w-[calc(100%+1rem)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`splat-${uid}`} x1="0%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#C8B6FF" />
              <stop offset="45%" stopColor="#9B7BFF" />
              <stop offset="100%" stopColor="#5B36D6" />
            </linearGradient>
          </defs>
          <g fill={`url(#splat-${uid})`} stroke="#151313" strokeWidth="4" strokeLinejoin="round">
            <path d="M30 40C20 18 60 6 90 14c25-12 60-10 85-2 30-12 80-6 95 16 25 8 28 42 14 60 12 16-4 34-26 30h-8c-2 10 2 28-6 30s-8-16-10-28c-29 6-59 2-84 4-2 12 0 28-9 28s-7-16-9-28c-27 2-62 4-80-4 0 12-2 22-9 22s-5-12-5-24C14 112 4 92 14 76 2 62 10 44 30 40Z" />
            <circle cx="292" cy="20" r="6" />
            <circle cx="12" cy="128" r="5" />
            <circle cx="284" cy="132" r="4" />
            <circle cx="198" cy="150" r="3.5" />
          </g>
          {/* wet-look highlights */}
          <ellipse cx="70" cy="32" rx="34" ry="9" fill="#fff" opacity="0.55" transform="rotate(-8 70 32)" />
          <ellipse cx="122" cy="26" rx="8" ry="4" fill="#fff" opacity="0.6" />
          <path d="M262 46c8 8 10 20 6 30" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.45" />
          <circle cx="243" cy="140" r="2.5" fill="#fff" opacity="0.7" />
          <circle cx="139" cy="144" r="2.5" fill="#fff" opacity="0.7" />
        </svg>
        <p
          className="relative px-4 pb-9 pt-3 font-display text-2xl uppercase leading-none tracking-tight text-white"
          style={{ textShadow: "2px 2px 0 #151313, -1px -1px 0 #151313" }}
        >
          {title}
        </p>
      </div>
      {action}
    </div>
  );
}
