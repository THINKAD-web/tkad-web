import {
  dayIsBlocked,
  startOfDay,
  type BlockedDayRange,
  ymdLocal,
} from "@/lib/calendar-date-range";

/** 카드·필터·섹션용 가용 등급 */
export type AvailabilityTier = "instant" | "partial" | "scarce" | "unknown";

export type MonthAvailabilityStats = {
  totalDays: number;
  availableDays: number;
  blockedDays: number;
  /** 0–100 (잔여 일수 비율) */
  availabilityPct: number;
  tier: AvailabilityTier;
};

export function tierFromAvailabilityPct(pct: number): AvailabilityTier {
  if (pct >= 70) return "instant";
  if (pct >= 20) return "partial";
  return "scarce";
}

export function getMonthDateRange(
  year: number,
  monthIndex: number,
): { start: Date; end: Date; fromYmd: string; toYmd: string } {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    start: startOfDay(start),
    end: startOfDay(end),
    fromYmd: ymdLocal(start),
    toYmd: ymdLocal(end),
  };
}

export function parseMonthParam(
  raw: string | null | undefined,
  ref = new Date(),
): { year: number; monthIndex: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      return { year: y, monthIndex: m - 1 };
    }
  }
  return { year: ref.getFullYear(), monthIndex: ref.getMonth() };
}

/** 이번 달(또는 지정 월) 잔여 일수 기준 가용률 */
export function computeMonthAvailabilityStats(
  blockedRanges: BlockedDayRange[],
  monthStart: Date,
  monthEnd: Date,
  today: Date = startOfDay(new Date()),
): MonthAvailabilityStats {
  const rangeStart =
    monthStart.getTime() > today.getTime() ? monthStart : today;
  const rangeEnd = monthEnd;

  if (rangeStart.getTime() > rangeEnd.getTime()) {
    return {
      totalDays: 0,
      availableDays: 0,
      blockedDays: 0,
      availabilityPct: 100,
      tier: "instant",
    };
  }

  let totalDays = 0;
  let blockedDays = 0;
  for (
    let d = new Date(rangeStart);
    d.getTime() <= rangeEnd.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    totalDays++;
    if (dayIsBlocked(d, blockedRanges)) blockedDays++;
  }

  const availableDays = totalDays - blockedDays;
  const availabilityPct =
    totalDays === 0
      ? 100
      : Math.round((availableDays / totalDays) * 100);

  return {
    totalDays,
    availableDays,
    blockedDays,
    availabilityPct,
    tier: tierFromAvailabilityPct(availabilityPct),
  };
}

export function bookingsToBlockedRanges(
  bookings: { startsAt: Date; endsAt: Date }[],
  fromDate: Date,
  cappedTo: Date,
): BlockedDayRange[] {
  return bookings.map((b) => {
    const start = b.startsAt < fromDate ? fromDate : b.startsAt;
    const end = b.endsAt > cappedTo ? cappedTo : b.endsAt;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });
}

export function formatEstimatedCostWon(
  won: number,
  locale: string,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  if (!won || won <= 0) {
    return isKo ? "문의" : "Contact us";
  }
  if (isKo) {
    if (won >= 100_000_000) {
      const eok = won / 100_000_000;
      const label =
        eok >= 10
          ? `${Math.round(eok).toLocaleString("ko-KR")}억`
          : `${eok.toFixed(1).replace(/\.0$/, "")}억`;
      return `약 ${label}원`;
    }
    if (won >= 10_000) {
      return `약 ${Math.round(won / 10_000).toLocaleString("ko-KR")}만원`;
    }
    return `약 ${won.toLocaleString("ko-KR")}원`;
  }
  if (won >= 1_000_000) {
    return `~₩${(won / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `~₩${won.toLocaleString("en-US")}`;
}
