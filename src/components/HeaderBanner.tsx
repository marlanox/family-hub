import type { ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

// Home header: a button on each side and, between them, the title on a
// Beetlejuice-style plaque — a frame of black-and-white diagonal stripes
// around a black panel, slightly askew.
export function HeaderBanner({ title, left, right }: HeaderBannerProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-4">
      <div className="shrink-0">{left}</div>
      <div className="min-w-0 flex-1 px-1">
        <div
          className="mx-auto w-fit max-w-full -rotate-2 border-3 border-ink p-[7px] shadow-pop"
          style={{ backgroundImage: "repeating-linear-gradient(-45deg, #151313 0 7px, #ffffff 7px 14px)" }}
        >
          <p className="border-2 border-white bg-ink px-3 py-2 text-center font-punk text-[0.95rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            {title}
          </p>
        </div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
