import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Facet } from "./Facet";
import { pointsToNextTrophy } from "@/lib/stats";

interface LeaderboardRowProps {
  rank: number;
  member: FamilyMember;
}

// Avatar color by place, podium-style, so two people never share a color
// on this screen even if their own accent colors happen to match.
const PLACE_BG = ["glitter-gold", "glitter-silver", "bg-violet", "bg-lemon", "bg-ink text-white", "stripes-bw"];

// Scrapbook cutout: white paper, a strip of tape on top, a slight tilt
// that alternates row to row, black-and-white rank stamp.
export function LeaderboardRow({ rank, member }: LeaderboardRowProps) {
  const placeBg = PLACE_BG[(rank - 1) % PLACE_BG.length];

  return (
    <Facet
      shape={rank + 1}
      className={cn("scrap-tape", rank % 2 === 1 ? "-rotate-1" : "rotate-1")}
      fillClassName="flex items-center gap-3 bg-white px-4 py-3"
    >
      <Facet kind="gem" shape={rank} shadow="none" className="h-9 w-9 shrink-0" fillClassName="flex items-center justify-center bg-ink font-graffiti text-lg text-white">
        {rank === 1 ? "👑" : rank}
      </Facet>
      {/* A photo fills the whole gem; only a letter avatar shows the place color. */}
      <Facet kind="gem" shape={rank + 2} shadow="none" className="h-12 w-12 shrink-0" fillClassName={cn("flex items-center justify-center", !member.photoUrl && placeBg)}>
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-lg text-ink">{member.displayName.charAt(0)}</span>
        )}
      </Facet>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base uppercase leading-none">{member.displayName}</p>
        <p className="mt-1 text-[10px] font-bold uppercase text-ink/50">🏆 через {pointsToNextTrophy(member.points)}</p>
      </div>
      <p className="font-graffiti text-2xl leading-none">{member.points}</p>
    </Facet>
  );
}
