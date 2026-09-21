import { accentMap } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/cn";

interface FamilyMemberStickerProps {
  member: FamilyMember;
  crown?: boolean;
  size?: "md" | "lg";
  /** Small pencil badge hinting "tap to open profile / change photo" — used on Home. */
  editHint?: boolean;
}

// Portrait cutout sitting inside an irregular sticker blob, with a colored
// ring per person and a name/points plaque underneath — see
// docs/ARCHITECTURE.md "Avatars & portraits" for why this replaces plain
// circular avatars everywhere.
export function FamilyMemberSticker({ member, crown, size = "md", editHint }: FamilyMemberStickerProps) {
  const accent = accentMap[member.accentColor];
  const dimension = size === "lg" ? "h-28 w-28" : "h-20 w-20";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {crown && (
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl" aria-hidden>
            👑
          </span>
        )}
        <div
          className={cn(
            "blob-shape flex items-center justify-center overflow-hidden border-3 border-ink shadow-pop",
            accent.bgSoft,
            dimension,
          )}
        >
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoUrl}
              alt={member.displayName}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <span className="font-display text-3xl text-ink/70">
              {member.displayName.charAt(0)}
            </span>
          )}
        </div>
        {editHint && (
          <span
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-white text-xs shadow-pop-sm"
            aria-hidden
          >
            ✏️
          </span>
        )}
      </div>
      <div className="rounded-2xl border-3 border-ink bg-white px-3 py-1.5 text-center shadow-pop-sm">
        <p className="font-display text-xs uppercase leading-none">{member.displayName}</p>
        <p className="mt-1 font-display text-sm leading-none">{member.points}</p>
        <p className="text-[9px] font-bold uppercase tracking-wide text-ink/50">баллов</p>
      </div>
    </div>
  );
}
