/**
 * 공개 가용성 API — 광고주가 매체 상세에서 "예약 불가" 날짜 확인용.
 *
 * 정책:
 *   - confirmed + tentative status 만 차단 표시 (lib/booking-conflict 의 CONFLICT_BLOCKING_STATUSES 와 동일 정책)
 *   - requested 는 운영 정보 (광고주 검토 중) → 비공개
 *   - cancelled / expired 는 응답에 포함 X
 *   - 광고주 식별 정보 (title, requesterName/Email/Phone, campaignId, notes 등) 일체 응답에 포함 X
 *     → 응답은 시간 범위 + status="blocked" 뿐
 *
 * GET /api/public/media/[id]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   - from / to: 선택 (기본: 오늘 ~ +90일). 최대 +180일까지만 허용.
 *   - 응답: { mediaId, from, to, blockedRanges: [{ start, end, status: "blocked" }] }
 *
 * 캐시: 30초 — 너무 길면 신규 예약 반영 늦고, 너무 짧으면 DB 부하.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { CONFLICT_BLOCKING_STATUSES } from "@/lib/booking-conflict";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_LOOKAHEAD_DAYS = 180;
const DEFAULT_LOOKAHEAD_DAYS = 90;

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
});

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id: mediaId } = await params;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const today = startOfDay(new Date());
  const fromDate = parsed.data.from
    ? startOfDay(new Date(`${parsed.data.from}T00:00:00`))
    : today;
  const toDate = parsed.data.to
    ? startOfDay(new Date(`${parsed.data.to}T00:00:00`))
    : new Date(today.getTime() + DEFAULT_LOOKAHEAD_DAYS * 86400000);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return Response.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (toDate <= fromDate) {
    return Response.json(
      { error: "to must be greater than from" },
      { status: 400 },
    );
  }

  // 너무 긴 조회 차단 (DB 부하 + 광고주 입장에서도 의미 없음)
  const maxTo = new Date(today.getTime() + MAX_LOOKAHEAD_DAYS * 86400000);
  const cappedTo = toDate > maxTo ? maxTo : toDate;

  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        mediaId,
        from: ymd(fromDate),
        to: ymd(cappedTo),
        blockedRanges: [],
      },
      { headers: { "cache-control": "public, max-age=30" } },
    );
  }

  const db = getPrisma();

  // 매체 존재 확인 (404 응답으로 광고주에게 정확한 피드백)
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { id: true, isActive: true },
  });
  if (!media || !media.isActive) {
    return Response.json({ error: "Media not found" }, { status: 404 });
  }

  // CONFLICT_BLOCKING_STATUSES (tentative + confirmed) 중 [fromDate, cappedTo) 범위와 오버랩되는 예약
  // 오버랩 조건: bookingStart < cappedTo && bookingEnd > fromDate
  const bookings = await db.mediaBooking.findMany({
    where: {
      mediaId,
      status: { in: [...CONFLICT_BLOCKING_STATUSES] },
      startsAt: { lt: cappedTo },
      endsAt: { gt: fromDate },
    },
    select: { startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });

  // 응답에는 광고주 식별 정보 일체 제외 — 시간 범위만.
  // 또한 조회 범위(fromDate ~ cappedTo) 외부로 삐져나간 부분은 잘라서 노출 (광고주 입장에서 의미 있는 범위만).
  const blockedRanges = bookings.map((b) => {
    const start = b.startsAt < fromDate ? fromDate : b.startsAt;
    const end = b.endsAt > cappedTo ? cappedTo : b.endsAt;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      status: "blocked" as const,
    };
  });

  return Response.json(
    {
      mediaId,
      from: ymd(fromDate),
      to: ymd(cappedTo),
      blockedRanges,
    },
    {
      headers: {
        // 짧은 캐시 — 새 예약 반영 지연 vs DB 부하 균형
        "cache-control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
