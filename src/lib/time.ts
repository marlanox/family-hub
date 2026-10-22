export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}

/** "22:00:00" (Postgres `time`) or "22:00" → "22:00". */
export function hhmm(time: string | undefined | null): string {
  return (time ?? "").slice(0, 5);
}

/** Russian plural: plural(1, "задача", "задачи", "задач") → "задача"; 2 → "задачи"; 5 → "задач". */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Activity lines used to read like a form ("Маша выполнил(а) …"). New
// ones are written without grammatical gender ("Маша — готово: …"); this
// rewrites the older stored ones — and the badge lines the database
// itself writes — into the same style for display.
const LEGACY_ACTIVITY: [RegExp, string][] = [
  [/^(.+?) выполнил\(а\) (.+)$/, "$1 — готово: $2"],
  [/^(.+?) отметил\(а\), что сегодня не будет делать (.+)$/, "$1 — сегодня не будет: $2"],
  [/^(.+?) перенес\(ла\) («.+?») на (.+)$/, "$1 — позже: $2, через $3"],
  [/^(.+?) назначил\(а\) новую задачу («.+?»): (.+)$/, "$1 → $3: новая задача $2"],
  [/^(.+?) добавил\(а\) инструкцию (.+)$/, "$1 — новая инструкция $2"],
  [/^(.+?) обновил\(а\) инструкцию (.+)$/, "$1 — правка в инструкции $2"],
  [/^(.+?) удалил\(а\) инструкцию (.+)$/, "$1 — инструкция удалена: $2"],
  [/^(.+?) присоединил\(ась\) к семье$/, "$1 — теперь в семье"],
  [/^(.+?) заработал\(а\) (.+)$/, "$1: $2"],
  [/^(.+?) получил\(а\) (.+)$/, "$1: $2"],
];

export function humanizeActivity(message: string): string {
  for (const [re, to] of LEGACY_ACTIVITY) {
    if (re.test(message)) return message.replace(re, to);
  }
  return message;
}
