import type { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  action?: ReactNode;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="font-display text-xl uppercase tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
