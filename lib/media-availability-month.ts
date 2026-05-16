import {
  MediaPeriodStatus,
  type MediaAvailabilityPeriod,
  type PrismaClient,
} from "@prisma/client";
import { CONFLICT_BLOCKING_STATUSES } from "@/lib/booking-conflict";

export type PublicDayStatus = "available" | "booked" | "reserved";

const STATUS_PRIORITY: Record<PublicDayStatus, number> = {
  available: 0,
  reserved: 1,
  booked: 2,
};

export type MonthAvailabilityPayload = {
  mediaId: string;
  month: string;
  days: Record<string, PublicDayStatus>;
  periods: {
    id: string;
    startDate: string;
    endDate: string;
    status: MediaPeriodStatus;
    note: string | null;
  }[];
};

export function parseAvailabilityMonth(month: string): {
  year: number;
  monthIndex: number;
  monthStart: Date;
  monthEnd: Date;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error("month must be YYYY-MM");
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error("invalid month");
  }
  const monthStart = startOfDay(new Date(year, monthIndex, 1));
  const monthEnd = endOfDay(new Date(year, monthIndex + 1, 0));
  return { year, monthIndex, monthStart, monthEnd };
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodStatusToPublic(status: MediaPeriodStatus): PublicDayStatus {
  switch (status) {
    case MediaPeriodStatus.BOOKED:
      return "booked";
    case MediaPeriodStatus.RESERVED:
      return "reserved";
    default:
      return "available";
  }
}

function mergeDayStatus(
  current: PublicDayStatus,
  next: PublicDayStatus,
): PublicDayStatus {
  return STATUS_PRIORITY[next] > STATUS_PRIORITY[current] ? next : current;
}

/** [start, end] inclusive date range vs calendar day */
export function dayOverlapsInclusiveRange(
  day: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const rs = startOfDay(rangeStart);
  const reExclusive = new Date(startOfDay(rangeEnd).getTime() + 86400000);
  return rs < dayEnd && reExclusive > dayStart;
}

/** Datetime booking range vs calendar day */
function dayOverlapsBooking(day: Date, startsAt: Date, endsAt: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return startsAt < dayEnd && endsAt > dayStart;
}

function eachDayInInclusiveRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function serializePeriod(p: MediaAvailabilityPeriod) {
  return {
    id: p.id,
    startDate: ymd(p.startDate),
    endDate: ymd(p.endDate),
    status: p.status,
    note: p.note,
  };
}

/**
 * 한 달치 일별 가용 상태.
 * - 어드민 슬롯(MediaAvailabilityPeriod)과 활성 예약(tentative/confirmed)을 병합
 * - 동일 날짜에 여러 소스가 있으면 booked > reserved > available
 * - 슬롯이 하나도 없는 매체는 예약만으로 캘린더 구성
 */
export async function fetchMediaMonthAvailability(
  db: PrismaClient,
  mediaId: string,
  month: string,
): Promise<MonthAvailabilityPayload> {
  const { monthStart, monthEnd } = parseAvailabilityMonth(month);

  const [periods, periodCount, bookings] = await Promise.all([
    db.mediaAvailabilityPeriod.findMany({
      where: {
        mediaId,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    }),
    db.mediaAvailabilityPeriod.count({ where: { mediaId } }),
    db.mediaBooking.findMany({
      where: {
        mediaId,
        status: { in: [...CONFLICT_BLOCKING_STATUSES] },
        startsAt: { lt: new Date(monthEnd.getTime() + 1) },
        endsAt: { gt: monthStart },
      },
      select: { startsAt: true, endsAt: true, status: true },
    }),
  ]);

  const days: Record<string, PublicDayStatus> = {};
  for (const day of eachDayInInclusiveRange(monthStart, monthEnd)) {
    const key = ymd(day);
    let status: PublicDayStatus = "available";

    if (periodCount > 0) {
      for (const p of periods) {
        if (dayOverlapsInclusiveRange(day, p.startDate, p.endDate)) {
          status = mergeDayStatus(status, periodStatusToPublic(p.status));
        }
      }
    }

    for (const b of bookings) {
      if (!dayOverlapsBooking(day, b.startsAt, b.endsAt)) continue;
      const fromBooking: PublicDayStatus =
        b.status === "confirmed" ? "booked" : "reserved";
      status = mergeDayStatus(status, fromBooking);
    }

    if (periodCount === 0 && bookings.length === 0) {
      status = "available";
    }

    days[key] = status;
  }

  return {
    mediaId,
    month,
    days,
    periods: periods.map(serializePeriod),
  };
}
