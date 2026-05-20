import { parseSeoulToday } from "@/lib/seoul-calendar";

export type MonitoringPeriod = "today" | "week" | "month";

export function periodToMs(period: MonitoringPeriod): number {
  switch (period) {
    case "today":
      return 86400000;
    case "week":
      return 7 * 86400000;
    case "month":
      return 30 * 86400000;
  }
}

/** Asia/Seoul 자정 (UTC Date) */
export function seoulDayStartUtc(now = new Date()): Date {
  const { y, mo, day } = parseSeoulToday(now);
  return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`);
}

export function periodStart(period: MonitoringPeriod, now = new Date()): Date {
  if (period === "today") return seoulDayStartUtc(now);
  return new Date(now.getTime() - periodToMs(period));
}
