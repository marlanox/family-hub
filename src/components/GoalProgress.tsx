import { Icon } from "./Icon";

interface GoalProgressProps {
  title: string;
  subtitle: string;
  current: number;
  target: number;
}

export function GoalProgress({ title, subtitle, current, target }: GoalProgressProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="rounded-sticker border-3 border-ink bg-pink-soft p-4 shadow-pop">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-sm uppercase leading-tight">{title}</p>
          <p className="mt-0.5 text-xs font-semibold text-ink/60">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-ink bg-yellow shadow-pop-sm">
          <Icon name="gift" className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 h-6 w-full overflow-hidden rounded-full border-3 border-ink bg-white">
        <div
          className="h-full bg-mint transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-right font-display text-xs">
        {current} / {target}
      </p>
    </div>
  );
}
