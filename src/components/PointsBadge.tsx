import { cn } from "@/lib/cn";

interface PointsBadgeProps {
  points: number;
  sign?: boolean;
  className?: string;
  tone?: "mint" | "yellow" | "pink" | "sky" | "ink";
}

const toneClasses: Record<NonNullable<PointsBadgeProps["tone"]>, string> = {
  mint: "bg-mint text-ink",
  yellow: "bg-yellow text-ink",
  pink: "bg-pink text-white",
  sky: "bg-sky text-ink",
  ink: "bg-ink text-white",
};

export function PointsBadge({ points, sign = true, className, tone = "mint" }: PointsBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 border-ink px-2.5 py-1 font-display text-xs leading-none shadow-pop-sm",
        toneClasses[tone],
        className,
      )}
    >
      {sign && points > 0 ? "+" : ""}
      {points}
    </span>
  );
}
