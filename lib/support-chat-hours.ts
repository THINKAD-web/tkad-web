/** 평일 09:00–18:00 KST 기준 상담 가능 여부 */
export type SupportHoursStatus = {
  isOpen: boolean;
  /** Asia/Seoul 기준 현재 시각 (디버그·표시용) */
  seoulHour: number;
  seoulMinute: number;
  weekday: number;
};

function getSeoulParts(now = new Date()): {
  hour: number;
  minute: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { hour, minute, weekday: map[wd] ?? 1 };
}

export function getSupportHoursStatus(now = new Date()): SupportHoursStatus {
  const { hour, minute, weekday } = getSeoulParts(now);
  const isWeekday = weekday >= 1 && weekday <= 5;
  const minutes = hour * 60 + minute;
  const openStart = 9 * 60;
  const openEnd = 18 * 60;
  const isOpen = isWeekday && minutes >= openStart && minutes < openEnd;
  return {
    isOpen,
    seoulHour: hour,
    seoulMinute: minute,
    weekday,
  };
}
