/** Plain calendar arithmetic in Asia/Seoul (no DST). */

export type YmdParts = { y: number; mo: number; day: number };

export function parseSeoulToday(now = new Date()): YmdParts {
  const s = now.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  const datePart = s.split(" ")[0] ?? "";
  const [y, mo, d] = datePart.split("-").map(Number);
  return { y, mo, day: d };
}

export function formatYmd(p: YmdParts): string {
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addCalendarDays(p: YmdParts, days: number): YmdParts {
  const x = new Date(Date.UTC(p.y, p.mo - 1, p.day + days));
  return {
    y: x.getUTCFullYear(),
    mo: x.getUTCMonth() + 1,
    day: x.getUTCDate(),
  };
}

/** Due `Date` (DB) → YYYY-MM-DD in Seoul. */
export function dateToSeoulYmd(d: Date): string {
  const s = d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  return (s.split(" ")[0] ?? "").slice(0, 10);
}

export function seoulTargetYmd(daysFromToday: number, now = new Date()): string {
  return formatYmd(addCalendarDays(parseSeoulToday(now), daysFromToday));
}

/** e.g. "Mon", "Tue" — Asia/Seoul wall clock. */
export function seoulWeekdayShort(now = new Date()): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);
}
