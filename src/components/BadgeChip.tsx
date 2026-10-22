import { Facet, shapeFor } from "./Facet";

interface BadgeChipProps {
  emoji: string;
  value: string | number;
  label: string;
}

export function BadgeChip({ emoji, value, label }: BadgeChipProps) {
  return (
    <Facet shape={shapeFor(label)} className="flex-1" fillClassName="flex flex-col items-center gap-1 bg-white p-3 text-center">
      <span className="text-2xl">{emoji}</span>
      <span className="font-display text-lg leading-none">{value}</span>
      <span className="text-[10px] font-bold uppercase leading-tight text-ink/55">{label}</span>
    </Facet>
  );
}
