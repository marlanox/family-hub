import type { IconKey } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const OPTIONS: IconKey[] = [
  "broom", "dishes", "vacuum", "cat", "dog", "homework", "shower", "laundry", "trash",
  "exercise", "phone-off", "alarm", "kitchen", "bedroom", "reading", "heart",
  "sun", "moon", "bed", "shirt", "house", "trophy", "star", "checklist", "food",
];

export function IconPicker({ value, onChange }: { value: IconKey; onChange: (icon: IconKey) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {OPTIONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          aria-pressed={value === icon}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border-3 border-ink shadow-pop-sm",
            value === icon ? "bg-yellow" : "bg-white",
          )}
        >
          <Icon name={icon} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
