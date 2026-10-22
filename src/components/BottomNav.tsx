"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Facet } from "./Facet";
import { Icon } from "./Icon";
import type { IconKey } from "@/lib/types";

const items: { href: string; label: string; icon: IconKey }[] = [
  { href: "/", label: "Главная", icon: "house" },
  { href: "/plan", label: "План", icon: "calendar" },
  { href: "/activity", label: "Активность", icon: "clock" },
  { href: "/rewards", label: "Награды", icon: "gift" },
];

// next.config.js sets trailingSlash: true, so a static export's actual
// pathname is "/plan/", never "/plan" — comparing that raw against
// `item.href` ("/plan") never matched for anything but "/" itself,
// which is exactly why only "Главная" ever visually lit up as active,
// on every single page, regardless of which one was actually open.
function stripTrailingSlash(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function BottomNav() {
  const pathname = stripTrailingSlash(usePathname());

  // Fixed to the viewport, not sticky inside the page: with iOS rubber-band
  // scrolling a sticky bar travelled up with the bounce and the page showed
  // through underneath it. The in-flow spacer keeps the last content from
  // ending up hidden behind the bar.
  return (
    <>
      <div className="h-[calc(4.75rem+env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t-3 border-ink bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="relative flex items-center justify-between">
          {items.slice(0, 2).map((item) => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}

          <Link
            href="/tasks/new"
            aria-label="Добавить задачу"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Facet kind="gem" shape={2} shadow="md" className="h-14 w-14" fillClassName="flex items-center justify-center bg-pink text-white">
              <Icon name="plus" className="h-7 w-7" />
            </Facet>
          </Link>

          <span className="w-14" aria-hidden />

          {items.slice(2).map((item) => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: IconKey };
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-bold uppercase",
        active ? "text-pink" : "text-ink/50",
      )}
    >
      <Icon name={item.icon} className="h-6 w-6" />
      {item.label}
    </Link>
  );
}
