interface BadgeChipProps {
  emoji: string;
  value: string | number;
  label: string;
}

export function BadgeChip({ emoji, value, label }: BadgeChipProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border-3 border-ink bg-white p-3 text-center shadow-pop-sm">
      <span className="text-2xl">{emoji}</span>
      <span className="font-display text-lg leading-none">{value}</span>
      <span className="text-[10px] font-bold uppercase leading-tight text-ink/55">{label}</span>
    </div>
  );
}
