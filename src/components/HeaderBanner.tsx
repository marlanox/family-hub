import { useId, type ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  action?: ReactNode;
}

// Home title on a "liquid glass" blob: a smooth organic shape with a
// soft lavender gradient, a lime glow underneath, a blurred glass
// highlight and a coloured shadow — no comic outline. Stretched to fit
// the text (preserveAspectRatio="none"); a squashed blob still reads.
export function HeaderBanner({ title, action }: HeaderBannerProps) {
  const uid = useId().replace(/[:]/g, "");

  return (
    <div className="flex items-start justify-between gap-2 px-4 pt-4">
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 300 150"
          preserveAspectRatio="none"
          className="absolute -inset-x-2 -top-3 h-[calc(100%+1.25rem)] w-[calc(100%+1rem)] drop-shadow-[0_10px_18px_rgba(106,69,224,0.45)]"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`base-${uid}`} cx="30%" cy="25%" r="85%">
              <stop offset="0%" stopColor="#D9CCFF" />
              <stop offset="45%" stopColor="#9B7BFF" />
              <stop offset="100%" stopColor="#5B36D6" />
            </radialGradient>
            <radialGradient id={`glow-${uid}`} cx="78%" cy="88%" r="45%">
              <stop offset="0%" stopColor="#D9FF4A" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#D9FF4A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`pink-${uid}`} cx="12%" cy="80%" r="40%">
              <stop offset="0%" stopColor="#FF9BD8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FF9BD8" stopOpacity="0" />
            </radialGradient>
            <filter id={`blur-${uid}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <clipPath id={`clip-${uid}`}>
              <path d={BLOB} />
            </clipPath>
          </defs>
          <path d={BLOB} fill={`url(#base-${uid})`} />
          <g clipPath={`url(#clip-${uid})`}>
            <rect width="300" height="150" fill={`url(#glow-${uid})`} />
            <rect width="300" height="150" fill={`url(#pink-${uid})`} />
            {/* glass highlight along the top edge */}
            <ellipse cx="120" cy="22" rx="110" ry="16" fill="#fff" opacity="0.55" filter={`url(#blur-${uid})`} />
            <path d={BLOB} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" />
          </g>
        </svg>
        <p className="relative px-5 pb-8 pt-4 text-center font-punk text-[1.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white [text-shadow:0_2px_12px_rgba(60,20,160,0.45)]">
          {title}
        </p>
      </div>
      {action}
    </div>
  );
}

// Smooth asymmetric blob — soft lobes, no drips.
const BLOB =
  "M38 22C70 2 120 8 158 6c44-2 92 2 118 26 22 20 22 52 14 76-8 26-34 40-70 40-34 0-58-8-92-6-38 2-70 12-100-4C2 124-4 96 6 70 14 48 18 34 38 22Z";
