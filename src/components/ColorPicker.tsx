import type { FamilyMember } from "@/lib/types";
import { accentMap } from "@/lib/colors";
import { cn } from "@/lib/cn";

const OPTIONS: FamilyMember["accentColor"][] = ["pink", "yellow", "lilac", "sky", "mint", "coral"];

export function ColorPicker({
  value,
  onChange,
}: {
  value: FamilyMember["accentColor"];
  onChange: (color: FamilyMember["accentColor"]) => void;
}) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            "h-9 w-9 rounded-full border-3 border-ink",
            accentMap[color].bg,
            value === color && "ring-2 ring-offset-2 ring-ink",
          )}
        />
      ))}
    </div>
  );
}
