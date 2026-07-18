import { CONFLICT_BLOCKING_STATUSES } from "@/lib/booking-conflict";
import {
  bookingsToBlockedRanges,
  computeMonthAvailabilityStats,
  getMonthDateRange,
  parseMonthParam,
  type AvailabilityTier,
} from "@/lib/media-availability-stats";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { RfpToBadge } from "@/lib/rfp-proposal-export/types";

export type RfpMediaAvailability = {
  tier: AvailabilityTier;
  blockedDays: number;
  availabilityPct: number;
  toBadge: RfpToBadge;
};

/**
 * 매체 ID 배치 → 이번 달(또는 지정 월) TO 요약.
 * 네트워크 매체는 범위 밖 — 예약 없으면 빈 차단으로 available.
 */
export async function fetchRfpMediaAvailabilityBatch(
  mediaIds: readonly string[],
  month?: string | null,
): Promise<Record<string, RfpMediaAvailability>> {
  const unique = [...new Set(mediaIds.map((id) => id.trim()).filter(Boolean))];
  const out: Record<string, RfpMediaAvailability> = {};
  for (const id of unique) {
    out[id] = {
      tier: "unknown",
      blockedDays: 0,
      availabilityPct: 100,
      toBadge: "inquire",
    };
  }
  if (unique.length === 0 || !isDatabaseConfigured()) return out;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { year, monthIndex } = parseMonthParam(month, today);
  const { start: monthStart, end: monthEnd } = getMonthDateRange(
    year,
    monthIndex,
  );
  const cappedTo = new Date(monthEnd.getTime() + 86400000);

  try {
    const db = getPrisma();
    const bookings = await db.mediaBooking.findMany({
      where: {
        mediaId: { in: unique },
        status: { in: [...CONFLICT_BLOCKING_STATUSES] },
        startsAt: { lt: cappedTo },
        endsAt: { gt: monthStart },
      },
      select: { mediaId: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    });

    const byMedia = new Map<string, { startsAt: Date; endsAt: Date }[]>();
    for (const b of bookings) {
      const list = byMedia.get(b.mediaId) ?? [];
      list.push({ startsAt: b.startsAt, endsAt: b.endsAt });
      byMedia.set(b.mediaId, list);
    }

    for (const id of unique) {
      const raw = byMedia.get(id) ?? [];
      const blockedRanges = bookingsToBlockedRanges(raw, monthStart, cappedTo);
      const stats = computeMonthAvailabilityStats(
        blockedRanges,
        monthStart,
        monthEnd,
        today,
      );
      // MVP: 차단일 있으면 문의 필요, 없으면 예약 가능
      const toBadge: RfpToBadge =
        stats.blockedDays > 0 ? "inquire" : "available";
      out[id] = {
        tier: stats.tier,
        blockedDays: stats.blockedDays,
        availabilityPct: stats.availabilityPct,
        toBadge,
      };
    }
  } catch (e) {
    console.error("[rfp-proposal-export/availability] failed", e);
  }

  return out;
}
