"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * The page content scrolls inside this box, not the document itself.
 * On iOS, when the whole document scrolls, rubber-banding moves the
 * visual viewport and drags `position: fixed` elements with it — the
 * bottom nav kept lifting off the bottom edge with the page showing
 * through under it. With the document pinned and only this box
 * scrolling, the nav stays put.
 */
export function AppScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Next only resets *window* scroll on navigation; this box would keep
  // the previous page's position.
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div ref={ref} className="h-dvh overflow-y-auto overscroll-y-contain">
      <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper pt-[env(safe-area-inset-top)]">{children}</div>
    </div>
  );
}
