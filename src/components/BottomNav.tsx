"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import type { IconKey } from "@/lib/types";

const items: { href: string; label: string; icon: IconKey }[] = [
  { href: "/", label: "Главная", icon: "house" },
  { href: "/plan", label: "План", icon: "calendar" },
  { href: "/activity", label: "Активность", icon: "clock" },
  { href: "/rewards", label: "Награды", icon: "gift" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t-3 border-ink bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="relative flex items-center justify-between">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}

        <Link
          href="/tasks/new"
          aria-label="Добавить задачу"
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-3 border-ink bg-pink text-white shadow-pop"
        >
          <Icon name="plus" className="h-7 w-7" />
        </Link>

        <span className="w-14" aria-hidden />

        {items.slice(2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}
      </div>
    </nav>
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
