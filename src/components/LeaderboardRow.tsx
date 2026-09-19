import { accentMap } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/cn";

interface LeaderboardRowProps {
  rank: number;
  member: FamilyMember;
}

export function LeaderboardRow({ rank, member }: LeaderboardRowProps) {
  const accent = accentMap[member.accentColor];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border-3 border-ink p-3 shadow-pop-sm",
        accent.bgSoft,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white font-display text-sm">
        {rank === 1 ? "👑" : rank}
      </span>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-white">
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-base">{member.displayName.charAt(0)}</span>
        )}
      </div>
      <p className="flex-1 font-display text-sm uppercase">{member.displayName}</p>
      <p className="font-display text-lg">{member.points}</p>
    </div>
  );
}
