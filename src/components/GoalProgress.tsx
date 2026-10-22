import { Facet } from "./Facet";
import { Icon } from "./Icon";

interface GoalProgressProps {
  title: string;
  subtitle: string;
  current: number;
  target: number;
}

// Silver-glitter card; the text sits on white labels because nothing
// stays readable directly on top of a sparkle texture.
export function GoalProgress({ title, subtitle, current, target }: GoalProgressProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <Facet shape={3} shadow="md" fillClassName="glitter-silver p-5">
      <div className="flex items-start justify-between gap-2">
        <Facet shape={1} fillClassName="bg-white px-3 py-1.5">
          <p className="font-display text-sm uppercase leading-tight">{title}</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{subtitle}</p>
        </Facet>
        <Facet kind="gem" shape={2} className="h-12 w-12 shrink-0" fillClassName="glitter-gold flex items-center justify-center">
          <Icon name="gift" className="h-7 w-7" />
        </Facet>
      </div>
      <Facet shape={5} shadow="none" className="mt-3 h-6" fillClassName="bg-white">
        <div className="h-full bg-pink transition-all" style={{ width: `${pct}%` }} />
      </Facet>
      <Facet shape={4} shadow="none" className="ml-auto mt-2 w-fit" fillClassName="bg-white px-3 py-1">
        <span className="font-display text-xs">
          {current} / {target}
        </span>
      </Facet>
    </Facet>
  );
}
