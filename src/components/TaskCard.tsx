import { taskTile } from "@/lib/colors";
import type { FamilyMember, IconKey } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Facet, shapeFor } from "./Facet";
import { Icon } from "./Icon";

export function TaskTileIcon({ icon, color }: { icon: IconKey; color: FamilyMember["accentColor"] }) {
  const tile = taskTile[color] ?? taskTile.violet;
  return (
    <Facet
      kind="gem"
      shape={shapeFor(icon + color)}
      shadow="none"
      className="h-11 w-11 shrink-0"
      fillClassName={cn("flex items-center justify-center", tile.bg)}
    >
      <span className={cn(tile.plate && "border-2 border-ink bg-white p-0.5")}>
        <Icon name={icon} className={cn(tile.plate ? "h-4 w-4" : "h-5 w-5", tile.icon)} />
      </span>
    </Facet>
  );
}

interface TaskCardProps {
  icon: IconKey;
  color: FamilyMember["accentColor"];
  title: string;
  assigneeLabel: string;
  timeLabel: string;
  points: number;
  completed?: boolean;
  surface?: "card" | "solid";
  onToggle?: () => void;
}

export function TaskCard({
  icon,
  color,
  title,
  assigneeLabel,
  timeLabel,
  points,
  completed,
  surface = "card",
  onToggle,
}: TaskCardProps) {
  const tile = taskTile[color] ?? taskTile.violet;

  return (
    <Facet
      shape={shapeFor(title)}
      fillClassName={cn("flex items-center gap-3 px-4 py-3", surface === "solid" ? tile.soft : "bg-white")}
    >
      <TaskTileIcon icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-display text-sm", completed && "line-through opacity-50")}>
          {title}
        </p>
        <p className="truncate text-xs font-semibold text-ink/55">
          {assigneeLabel} · {timeLabel}
        </p>
      </div>
      <Facet shape={shapeFor(title) + 3} shadow="none" fillClassName="bg-lime px-2.5 py-1">
        <span className="font-display text-[11px] leading-none">+{points}</span>
      </Facet>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={completed}
        aria-label={completed ? "Задача выполнена" : "Отметить выполненной"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink",
          completed ? "bg-ink text-white" : "bg-white",
        )}
      >
        {completed && (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m5 13 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </Facet>
  );
}
