/** YYYY-MM-DD (local calendar day) */
export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseYmdLocal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (ymdLocal(date) !== s) return null;
  return date;
}

export function diffDaysInclusive(start: Date, end: Date): number {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.round((e - s) / 86400000) + 1;
}

export function isDayInRange(
  day: Date,
  rangeStart: Date | null,
  rangeEnd: Date | null,
): boolean {
  if (!rangeStart) return false;
  const t = startOfDay(day).getTime();
  const s = rangeStart.getTime();
  if (!rangeEnd) return t === s;
  const e = rangeEnd.getTime();
  return t >= Math.min(s, e) && t <= Math.max(s, e);
}

export type BlockedDayRange = { start: string; end: string };

export function dayIsBlocked(date: Date, blocked: BlockedDayRange[]): boolean {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return blocked.some((r) => {
    const rStart = new Date(r.start);
    const rEnd = new Date(r.end);
    return rStart < dayEnd && rEnd > dayStart;
  });
}

export function rangeHasBlockedDays(
  start: Date,
  end: Date,
  blocked: BlockedDayRange[],
): boolean {
  const a = startOfDay(start);
  const b = startOfDay(end);
  const [from, to] = a <= b ? [a, b] : [b, a];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (dayIsBlocked(d, blocked)) return true;
  }
  return false;
}

export function formatRangeDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
