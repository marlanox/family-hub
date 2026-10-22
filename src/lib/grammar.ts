// Activity and notification wording with proper Russian verb forms. The
// family told us who is who: Маша and Наташа are feminine, Ваня is
// masculine. Anyone else (a renamed or newly added member) gets a
// gender-free phrasing ("Имя — готово: …") until added here.
type Gender = "f" | "m";

const FAMILY_GENDER: Record<string, Gender> = {
  маша: "f",
  наташа: "f",
  ваня: "m",
};

function genderOf(name: string): Gender | null {
  return FAMILY_GENDER[name.trim().toLowerCase()] ?? null;
}

/** Verb agreeing with the subject(s); null when one person's gender isn't known. */
function verb(names: string[], m: string, f: string, plural: string): string | null {
  if (names.length > 1) return plural;
  const g = genderOf(names[0] ?? "");
  return g === "f" ? f : g === "m" ? m : null;
}

/** «кому»: Маша → Маше, Ваня → Ване, Мария → Марии. */
export function dative(name: string): string {
  const n = name.trim();
  if (/ия$/.test(n)) return `${n.slice(0, -2)}ии`;
  if (/[ая]$/.test(n)) return `${n.slice(0, -1)}е`;
  return n;
}

function list(names: string[]): string {
  return names.join(", ");
}

export function msgCompleted(names: string[], title: string, rest = ""): string {
  const v = verb(names, "выполнил", "выполнила", "выполнили");
  return v ? `${list(names)} ${v} «${title}»${rest}` : `${list(names)} — готово: «${title}»${rest}`;
}

export function msgRefused(names: string[], title: string, rest = ""): string {
  return `${list(names)} сегодня не ${names.length > 1 ? "будут" : "будет"} делать «${title}»${rest}`;
}

export function msgSnoozed(names: string[], title: string, until: string): string {
  const v = verb(names, "перенёс", "перенесла", "перенесли");
  return v ? `${list(names)} ${v} «${title}» на ${until}` : `${list(names)} — позже: «${title}», через ${until}`;
}

/** `to` is "Всем", a name list ("Маша, Ваня") or "по очереди (Маша, Наташа)". */
export function msgAssigned(creator: string, to: string, title: string): string {
  const v = verb([creator], "поручил", "поручила", "поручили");
  if (!v) return `${creator} → ${to}: новая задача «${title}»`;
  const rotation = to.match(/^по очереди \((.+)\)$/);
  const toDative =
    to.toLowerCase() === "всем"
      ? "всем"
      : rotation
        ? `по очереди ${(rotation[1] ?? "").split(", ").map(dative).join(" и ")}`
        : to.split(", ").map(dative).join(" и ");
  return `${creator} ${v} ${toDative} «${title}»`;
}

export function msgGuide(kind: "added" | "updated" | "deleted", editor: string, title: string): string {
  const forms = {
    added: ["добавил", "добавила", "— новая инструкция"],
    updated: ["обновил", "обновила", "— правка в инструкции"],
    deleted: ["удалил", "удалила", "— инструкция удалена:"],
  }[kind];
  const v = verb([editor], forms[0]!, forms[1]!, forms[0]!);
  return v ? `${editor} ${v} инструкцию «${title}»` : `${editor} ${forms[2]} «${title}»`;
}

export function msgJoined(name: string): string {
  const v = verb([name], "присоединился", "присоединилась", "присоединились");
  return v ? `${name} ${v} к семье` : `${name} — теперь в семье`;
}

export function msgTrophy(name: string, points: number): string {
  const v = verb([name], "заработал", "заработала", "заработали");
  return v ? `${name} ${v} кубок за ${points} баллов!` : `${name}: кубок за ${points} баллов!`;
}

export function msgBadge(name: string, label: string): string {
  const v = verb([name], "получил", "получила", "получили");
  return v ? `${name} ${v} ${label}` : `${name}: ${label}`;
}

export function msgUndone(names: string[], title: string, points: number): string {
  return `Отменено «${title}» (−${points}) — ${list(names)}`;
}

const names = (s: string) => s.split(", ").map((n) => n.trim());

// Entries already stored in the log come in three styles — the original
// "Маша выполнил(а) …", the gender-free "Маша — готово: …" used for a
// while, and the database's own badge lines — all rebuilt here with the
// right verb forms for display.
const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^(.+?) (?:выполнил\(а\)|— готово:) «(.+?)»(.*)$/, (_, who, t, rest) => msgCompleted(names(who!), t!, rest)],
  [/^(.+?) (?:отметил\(а\), что сегодня не будет делать|— сегодня не будет:) «(.+?)»(.*)$/, (_, who, t, rest) => msgRefused(names(who!), t!, rest)],
  [/^(.+?) перенес\(ла\) «(.+?)» на (.+)$/, (_, who, t, until) => msgSnoozed(names(who!), t!, until!)],
  [/^(.+?) — позже: «(.+?)», через (.+)$/, (_, who, t, until) => msgSnoozed(names(who!), t!, until!)],
  [/^(.+?) назначил\(а\) новую задачу «(.+?)»: (.+)$/, (_, who, t, to) => msgAssigned(who!, to!, t!)],
  [/^(.+?) → (.+?): новая задача «(.+?)»$/, (_, who, to, t) => msgAssigned(who!, to!, t!)],
  [/^(.+?) (?:добавил\(а\) инструкцию|— новая инструкция) «(.+?)»$/, (_, who, t) => msgGuide("added", who!, t!)],
  [/^(.+?) (?:обновил\(а\) инструкцию|— правка в инструкции) «(.+?)»$/, (_, who, t) => msgGuide("updated", who!, t!)],
  [/^(.+?) (?:удалил\(а\) инструкцию|— инструкция удалена:) «(.+?)»$/, (_, who, t) => msgGuide("deleted", who!, t!)],
  [/^(.+?) (?:присоединил\(ась\) к семье|— теперь в семье)$/, (_, who) => msgJoined(who!)],
  [/^(.+?)(?: заработал\(а\)|:) кубок за (\d+) баллов!$/, (_, who, p) => msgTrophy(who!, Number(p))],
  [/^(.+?)(?: получил\(а\)|:) (значок .+)$/, (_, who, label) => msgBadge(who!, label!)],
  [/^(.+?) — отменено: «(.+?)» \(−(\d+)\)$/, (_, who, t, p) => msgUndone(names(who!), t!, Number(p))],
];

export function humanizeActivity(message: string): string {
  for (const [re, build] of PATTERNS) {
    const m = message.match(re);
    if (m) return build(...m);
  }
  return message;
}
