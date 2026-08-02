/**
 * 목록·카드용 매체 가용 요약 (이번 달 잔여 일수 기준).
 * GET /api/public/media/availability-summary?month=YYYY-MM
 */
import { NextRequest } from "next/server";
import { activeBookingWhere } from "@/lib/booking-conflict";
import {
  bookingsToBlockedRanges,
  computeMonthAvailabilityStats,
  getMonthDateRange,
  parseMonthParam,
  type AvailabilityTier,
} from "@/lib/media-availability-stats";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 300;

type SummaryItem = {
  availabilityPct: number;
  availableDays: number;
  totalDays: number;
  blockedDays: number;
  tier: AvailabilityTier;
};

export async function GET(request: NextRequest) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthParam = new URL(request.url).searchParams.get("month");
  const { year, monthIndex } = parseMonthParam(monthParam, today);
  const { start: monthStart, end: monthEnd, fromYmd, toYmd } =
    getMonthDateRange(year, monthIndex);

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  const cacheHeaders = {
    "cache-control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
  };

  if (!isDatabaseConfigured()) {
    return Response.json(
      { month: monthKey, from: fromYmd, to: toYmd, items: {} as Record<string, SummaryItem> },
      { headers: cacheHeaders },
    );
  }

  const db = getPrisma();
  const cappedTo = new Date(monthEnd.getTime() + 86400000);

  const activeMedia = await db.media.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const mediaIds = activeMedia.map((m) => m.id);

  if (mediaIds.length === 0) {
    return Response.json(
      { month: monthKey, from: fromYmd, to: toYmd, items: {} },
      { headers: cacheHeaders },
    );
  }

  const bookings = await db.mediaBooking.findMany({
    where: {
      mediaId: { in: mediaIds },
      ...activeBookingWhere(),
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

  const items: Record<string, SummaryItem> = {};
  for (const id of mediaIds) {
    const raw = byMedia.get(id) ?? [];
    const blockedRanges = bookingsToBlockedRanges(raw, monthStart, cappedTo);
    const stats = computeMonthAvailabilityStats(
      blockedRanges,
      monthStart,
      monthEnd,
      today,
    );
    items[id] = {
      availabilityPct: stats.availabilityPct,
      availableDays: stats.availableDays,
      totalDays: stats.totalDays,
      blockedDays: stats.blockedDays,
      tier: stats.tier,
    };
  }

  return Response.json(
    { month: monthKey, from: fromYmd, to: toYmd, items },
    { headers: cacheHeaders },
  );
}
