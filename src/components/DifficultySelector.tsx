import type { Difficulty } from "@/lib/types";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Difficulty; label: string; suggested: number }[] = [
  { value: "easy", label: "Легко", suggested: 15 },
  { value: "normal", label: "Средне", suggested: 30 },
  { value: "hard", label: "Сложно", suggested: 70 },
  { value: "epic", label: "Эпик", suggested: 150 },
];

export function DifficultySelector({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (difficulty: Difficulty, suggestedPoints: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value, opt.suggested)}
          className={cn(
            "rounded-xl border-3 border-ink py-2 text-center font-display text-[11px] uppercase shadow-pop-sm",
            value === opt.value ? "bg-mint" : "bg-white",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
