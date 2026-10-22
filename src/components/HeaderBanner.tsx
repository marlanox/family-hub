import { useId, type ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  action?: ReactNode;
}

// Home title on a 70s pin-up paint splat: purple with white polka dots,
// drips running off the bottom, a cream inline and a plum offset shadow,
// all under a dry, rough scrapbook-paper grain. Stretched to fit the
// text (preserveAspectRatio="none"); a slightly squashed splat still reads.
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
            <linearGradient id={`fill-${uid}`} x1="0%" y1="0%" x2="60%" y2="100%">
              <stop offset="0%" stopColor="#B593FF" />
              <stop offset="100%" stopColor="#7A45F0" />
            </linearGradient>
            <pattern id={`dots-${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2.6" fill="#FFF3DC" />
              <circle cx="12" cy="12" r="2.6" fill="#FFF3DC" />
            </pattern>
            {/* dry paper: fine fractal noise, darkening only */}
            <filter id={`paper-${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="4" result="n" />
              <feColorMatrix
                in="n"
                type="matrix"
                values="0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 0 0.3  0 0 0 -1.6 1.05"
              />
            </filter>
            <clipPath id={`clip-${uid}`}>
              <path d={SPLAT} />
              {DROPS.map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
              ))}
            </clipPath>
          </defs>

          {/* retro offset shadow */}
          <g transform="translate(5 6)" fill="#3B1E7A">
            <path d={SPLAT} />
            {DROPS.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>

          <g fill={`url(#fill-${uid})`} stroke="#2A1260" strokeWidth="4" strokeLinejoin="round">
            <path d={SPLAT} />
            {DROPS.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>

          <g clipPath={`url(#clip-${uid})`}>
            <rect width="300" height="160" fill={`url(#dots-${uid})`} opacity="0.55" />
            <rect width="300" height="160" filter={`url(#paper-${uid})`} opacity="0.55" />
          </g>

          {/* cream inline, pin-up sign style */}
          <path d={SPLAT} fill="none" stroke="#FFF3DC" strokeWidth="2" strokeDasharray="1 0" transform="translate(150 80) scale(0.94) translate(-150 -80)" />

          {/* wet highlights on the drips */}
          <circle cx="243" cy="140" r="2.5" fill="#fff" opacity="0.8" />
          <circle cx="139" cy="144" r="2.5" fill="#fff" opacity="0.8" />
          <circle cx="45" cy="128" r="2" fill="#fff" opacity="0.8" />
        </svg>
        <p className="relative px-5 pb-10 pt-4 text-center font-punk text-[1.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white [text-shadow:2px_2px_0_#2A1260,3px_3px_0_#2A1260]">
          {title}
        </p>
      </div>
      {action}
    </div>
  );
}

// Splat with three drips running off the bottom.
const SPLAT =
  "M30 40C20 18 60 6 90 14c25-12 60-10 85-2 30-12 80-6 95 16 25 8 28 42 14 60 12 16-4 34-26 30h-8c-2 10 2 28-6 30s-8-16-10-28c-29 6-59 2-84 4-2 12 0 28-9 28s-7-16-9-28c-27 2-62 4-80-4 0 12-2 22-9 22s-5-12-5-24C14 112 4 92 14 76 2 62 10 44 30 40Z";
// Loose splatter drops around it.
const DROPS: [number, number, number][] = [
  [292, 20, 6],
  [12, 128, 5],
  [284, 132, 4],
  [198, 150, 3.5],
];
