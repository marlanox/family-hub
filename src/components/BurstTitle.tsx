import { cn } from "@/lib/cn";

interface BurstTitleProps {
  children: string;
  color?: "yellow" | "pink" | "sky";
  className?: string;
}

/** Spiky comic-burst page title, e.g. "ДОБАВИТЬ ЗАДАЧУ", "РЕЙТИНГ". */
export function BurstTitle({ children, color = "yellow", className }: BurstTitleProps) {
  const bg = color === "yellow" ? "bg-yellow" : color === "pink" ? "bg-pink" : "bg-sky";
  const text = color === "pink" ? "text-white" : "text-ink";

  return (
    <div
      className={cn(
        "spike-burst flex aspect-square w-40 -rotate-3 items-center justify-center border-3 border-ink p-6",
        bg,
        className,
      )}
    >
      <p className={cn("text-center font-display text-lg leading-none", text)}>{children}</p>
    </div>
  );
}
