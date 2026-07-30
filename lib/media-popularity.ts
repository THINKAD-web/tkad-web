import type { ConversionEventType } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** 찜×3 + 문의×5 + 조회×1 + 예약×10 */
export const POPULARITY_WEIGHTS = {
  favorite: 3,
  inquiry: 5,
  view: 1,
  booking: 10,
} as const;

/** 최종 popularityScore = 7일×0.6 + 30일×0.4 */
export const POPULARITY_BLEND = { days7: 0.6, days30: 0.4 } as const;

/**
 * 즉석 인기 폴백 점수 — cron `popularityScore` 가 아직 0 일 때 사용.
 * 누적 조회수 + 매체 본연의 노출/가시성 신호로 의미 있는 차등 정렬을 만든다.
 * (popularityScore 가 쌓이면 그 값이 우선)
 */
/** browse·지도 인기순 — 홈 주간 인기와 동일 폴백 점수, 유동인구는 tie-break */
export function compareMediaPopularRank(
  a: {
    popularityScore?: number | null;
    viewCount?: number | null;
    visibilityScore?: number | null;
    dailyFootfall?: number | null;
    dailyFootTraffic?: number | null;
    impressions?: number | null;
    instantBookingEnabled?: boolean | null;
    createdAt?: string | null;
  },
  b: {
    popularityScore?: number | null;
    viewCount?: number | null;
    visibilityScore?: number | null;
    dailyFootfall?: number | null;
    dailyFootTraffic?: number | null;
    impressions?: number | null;
    instantBookingEnabled?: boolean | null;
    createdAt?: string | null;
  },
): number {
  const toScore = (m: typeof a) =>
    mediaPopularityFallbackScore({
      popularityScore: m.popularityScore,
      viewCount: m.viewCount,
      visibilityScore: m.visibilityScore,
      dailyFootfall: m.dailyFootfall ?? m.dailyFootTraffic,
      impressions: m.impressions,
      instantBookingEnabled: m.instantBookingEnabled,
    });
  const byPopularity = toScore(b) - toScore(a);
  if (byPopularity !== 0) return byPopularity;
  const byFoot =
    (b.dailyFootTraffic ?? b.dailyFootfall ?? 0) -
    (a.dailyFootTraffic ?? a.dailyFootfall ?? 0);
  if (byFoot !== 0) return byFoot;
  const at = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
  return bt - at;
}

export function mediaPopularityFallbackScore(m: {
  popularityScore?: number | null;
  viewCount?: number | null;
  visibilityScore?: number | null;
  dailyFootfall?: number | null;
  impressions?: number | null;
  instantBookingEnabled?: boolean | null;
}): number {
  const real = m.popularityScore ?? 0;
  // 실제 참여 점수가 있으면 그것을 크게 우선 (폴백 신호보다 항상 위)
  if (real > 0) return 1_000_000 + real;
  return (
    (m.viewCount ?? 0) * 5 +
    (m.visibilityScore ?? 0) * 3 +
    (m.dailyFootfall ?? 0) / 1000 +
    (m.impressions ?? 0) / 20000 +
    (m.instantBookingEnabled ? 40 : 0)
  );
}

type EngagementCounts = {
  favorites: number;
  inquiries: number;
  views: number;
  bookings: number;
};

function emptyCounts(): EngagementCounts {
  return { favorites: 0, inquiries: 0, views: 0, bookings: 0 };
}

function parseMediaIds(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) return arr.map((x) => String(x)).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return t.split(/[,\s]+/).filter(Boolean);
}

function scoreFromCounts(c: EngagementCounts): number {
  return (
    c.favorites * POPULARITY_WEIGHTS.favorite +
    c.inquiries * POPULARITY_WEIGHTS.inquiry +
    c.views * POPULARITY_WEIGHTS.view +
    c.bookings * POPULARITY_WEIGHTS.booking
  );
}

function conversionTypeToField(
  type: ConversionEventType,
): keyof EngagementCounts | null {
  switch (type) {
    case "media_view":
      return "views";
    case "favorite":
      return "favorites";
    case "quote_request":
      return "inquiries";
    case "contract":
      return "bookings";
    default:
      return null;
  }
}

/** PageView·ConversionEvent 등 공개 트래킹 이벤트 */
async function mergeConversionEngagement(
  map: Map<string, EngagementCounts>,
  since: Date,
): Promise<void> {
  const db = getPrisma();
  const rows = await db.conversionEvent.groupBy({
    by: ["mediaId", "type"],
    where: {
      createdAt: { gte: since },
      mediaId: { not: null },
      type: {
        in: ["media_view", "favorite", "quote_request", "contract"],
      },
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    if (!row.mediaId) continue;
    const field = conversionTypeToField(row.type);
    if (!field) continue;
    const cur = map.get(row.mediaId) ?? emptyCounts();
    cur[field] += row._count._all;
    map.set(row.mediaId, cur);
  }
}

async function loadEngagementSince(
  since: Date,
): Promise<Map<string, EngagementCounts>> {
  const db = getPrisma();
  const map = new Map<string, EngagementCounts>();

  const bump = (id: string, field: keyof EngagementCounts, n = 1) => {
    const cur = map.get(id) ?? emptyCounts();
    cur[field] += n;
    map.set(id, cur);
  };

  const [favorites, views, quotes, instantBookings, mediaBookings, oohQuotes] =
    await Promise.all([
      db.userFavoriteMedia.groupBy({
        by: ["mediaId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      db.userRecentlyViewedMedia.groupBy({
        by: ["mediaId"],
        where: { visitedAt: { gte: since } },
        _count: { _all: true },
      }),
      db.quoteRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { mediaIds: true },
        take: 8000,
        orderBy: { createdAt: "desc" },
      }),
      db.booking.findMany({
        where: {
          createdAt: { gte: since },
          status: { in: ["paid", "confirmed"] },
        },
        select: { mediaId: true },
        take: 5000,
      }),
      db.mediaBooking.findMany({
        where: {
          createdAt: { gte: since },
          status: { in: ["confirmed", "tentative", "requested"] },
        },
        select: { mediaId: true },
        take: 5000,
      }),
      db.ooHQuote.findMany({
        where: { createdAt: { gte: since } },
        select: { mediaIds: true },
        take: 5000,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  for (const row of favorites) {
    bump(row.mediaId, "favorites", row._count._all);
  }
  for (const row of views) {
    bump(row.mediaId, "views", row._count._all);
  }
  for (const q of quotes) {
    for (const id of parseMediaIds(q.mediaIds)) {
      bump(id, "inquiries", 1);
    }
  }
  for (const b of instantBookings) {
    bump(b.mediaId, "bookings", 1);
  }
  for (const b of mediaBookings) {
    bump(b.mediaId, "bookings", 1);
  }
  for (const q of oohQuotes) {
    for (const id of q.mediaIds) {
      bump(String(id), "inquiries", 1);
    }
  }

  await mergeConversionEngagement(map, since);

  return map;
}

export type MediaPopularityScores = {
  score7d: number;
  score30d: number;
  popularityScore: number;
};

export function blendPopularityScores(
  score7d: number,
  score30d: number,
): number {
  return Math.round(
    score7d * POPULARITY_BLEND.days7 + score30d * POPULARITY_BLEND.days30,
  );
}

export async function computeMediaPopularityScores(): Promise<
  Map<string, MediaPopularityScores>
> {
  const now = Date.now();
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [map7, map30] = await Promise.all([
    loadEngagementSince(since7),
    loadEngagementSince(since30),
  ]);

  const ids = new Set<string>([...map7.keys(), ...map30.keys()]);
  const out = new Map<string, MediaPopularityScores>();

  for (const id of ids) {
    const score7d = scoreFromCounts(map7.get(id) ?? emptyCounts());
    const score30d = scoreFromCounts(map30.get(id) ?? emptyCounts());
    out.set(id, {
      score7d,
      score30d,
      popularityScore: blendPopularityScores(score7d, score30d),
    });
  }

  return out;
}

/** 최근 24시간 참여 점수 — browse `/media` 인기순(일간)용 */
export async function computeDailyEngagementScores(): Promise<Map<string, number>> {
  const since1d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const map = await loadEngagementSince(since1d);
  const out = new Map<string, number>();
  for (const [id, counts] of map) {
    out.set(id, scoreFromCounts(counts));
  }
  return out;
}

/**
 * 모든 활성 매체 popularityScore 갱신 (cron·수동 호출).
 */
export async function updateAllMediaPopularityScores(): Promise<{
  updated: number;
  withActivity: number;
}> {
  if (!isDatabaseConfigured()) {
    return { updated: 0, withActivity: 0 };
  }

  const db = getPrisma();
  const scores = await computeMediaPopularityScores();
  const allMedia = await db.media.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const now = new Date();
  let withActivity = 0;

  const BATCH = 40;
  for (let i = 0; i < allMedia.length; i += BATCH) {
    const chunk = allMedia.slice(i, i + BATCH);
    await db.$transaction(
      chunk.map((m) => {
        const s = scores.get(m.id) ?? {
          score7d: 0,
          score30d: 0,
          popularityScore: 0,
        };
        if (s.popularityScore > 0) withActivity += 1;
        return db.media.update({
          where: { id: m.id },
          data: {
            popularityScore: s.popularityScore,
            popularityUpdatedAt: now,
          },
        });
      }),
    );
  }

  return { updated: allMedia.length, withActivity };
}
