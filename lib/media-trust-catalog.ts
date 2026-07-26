import type { MediaItem } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  type MediaExecutionStats,
  type MediaTrustBadgeContext,
  computeTrustBadges,
  computeTrustScore,
  monthsSince,
  resolvePublicExecutionStats,
} from "@/lib/media-trust";

function emptyExecutionStats(): MediaExecutionStats {
  return { totalCount: 0, lastExecutionAt: null, monthsSinceLast: null };
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

async function loadMonthlyInquiryCounts(
  since: Date,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isDatabaseConfigured()) return map;

  const db = getPrisma();
  const bump = (id: string, n = 1) => {
    map.set(id, (map.get(id) ?? 0) + n);
  };

  const [quotes, oohQuotes, conversions] = await Promise.all([
    db.quoteRequest
      .findMany({
        where: { createdAt: { gte: since } },
        select: { mediaIds: true },
        take: 8000,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    db.ooHQuote
      .findMany({
        where: { createdAt: { gte: since } },
        select: { mediaIds: true },
        take: 5000,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    db.conversionEvent
      .groupBy({
        by: ["mediaId"],
        where: {
          createdAt: { gte: since },
          type: "quote_request",
          mediaId: { not: null },
        },
        _count: { _all: true },
      })
      .catch(() => [] as Array<{ mediaId: string | null; _count: { _all: number } }>),
  ]);

  for (const q of quotes) {
    for (const id of parseMediaIds(q.mediaIds)) bump(id);
  }
  for (const q of oohQuotes) {
    for (const id of q.mediaIds) bump(String(id));
  }
  for (const row of conversions) {
    if (row.mediaId) bump(row.mediaId, row._count._all);
  }

  return map;
}

/** 이번 달 문의 Top 10 */
async function fetchTopInquiryMediaIds(limit = 10): Promise<Set<string>> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const counts = await loadMonthlyInquiryCounts(monthStart);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  return new Set(top);
}

async function loadViewCountsSince(since: Date): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isDatabaseConfigured()) return map;
  const db = getPrisma();

  const [recentViews, conversions] = await Promise.all([
    db.userRecentlyViewedMedia
      .groupBy({
        by: ["mediaId"],
        where: { visitedAt: { gte: since } },
        _count: { _all: true },
      })
      .catch(() => []),
    db.conversionEvent
      .groupBy({
        by: ["mediaId"],
        where: {
          createdAt: { gte: since },
          type: "media_view",
          mediaId: { not: null },
        },
        _count: { _all: true },
      })
      .catch(() => [] as Array<{ mediaId: string | null; _count: { _all: number } }>),
  ]);

  for (const row of recentViews) {
    map.set(row.mediaId, (map.get(row.mediaId) ?? 0) + row._count._all);
  }
  for (const row of conversions) {
    if (row.mediaId) {
      map.set(row.mediaId, (map.get(row.mediaId) ?? 0) + row._count._all);
    }
  }
  return map;
}

/** 최근 7일 조회 급상승 Top 10 */
async function fetchHotWeekMediaIds(limit = 10): Promise<Set<string>> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86400_000);
  const twoWeeksAgo = new Date(now - 14 * 86400_000);

  const [thisWeek, prevWeek] = await Promise.all([
    loadViewCountsSince(weekAgo),
    loadViewCountsSince(twoWeeksAgo),
  ]);

  const growth: { id: string; delta: number; current: number }[] = [];
  for (const [id, current] of thisWeek) {
    const prev = (prevWeek.get(id) ?? 0) - current;
    const prevOnly = Math.max(prev, 0);
    const delta = current - prevOnly;
    if (current >= 3 && delta > 0) {
      growth.push({ id, delta, current });
    }
  }

  growth.sort((a, b) => b.delta - a.delta || b.current - a.current);
  return new Set(growth.slice(0, limit).map((g) => g.id));
}

export async function fetchTrustBadgeContext(): Promise<MediaTrustBadgeContext> {
  const [topInquiryIds, hotWeekIds] = await Promise.all([
    fetchTopInquiryMediaIds(10),
    fetchHotWeekMediaIds(10),
  ]);
  return { topInquiryIds, hotWeekIds };
}

export async function fetchExecutionStatsByMediaIds(
  ids: string[],
): Promise<Map<string, MediaExecutionStats>> {
  const result = new Map<string, MediaExecutionStats>();
  if (!isDatabaseConfigured() || ids.length === 0) return result;

  const db = getPrisma();
  const uniqueIds = [...new Set(ids)];

  const [bookings, executions, instant] = await Promise.all([
    db.mediaBooking
      .groupBy({
        by: ["mediaId"],
        where: {
          mediaId: { in: uniqueIds },
          status: "confirmed",
          isOwnerBlock: false,
        },
        _count: { _all: true },
        _max: { endsAt: true },
      })
      .catch(() => []),
    db.mediaAdvertiserExecution
      .groupBy({
        by: ["mediaId"],
        where: { mediaId: { in: uniqueIds } },
        _count: { _all: true },
        _max: { periodEnd: true },
      })
      .catch(() => []),
    db.booking
      .groupBy({
        by: ["mediaId"],
        where: {
          mediaId: { in: uniqueIds },
          status: { in: ["paid", "confirmed"] },
        },
        _count: { _all: true },
        _max: { updatedAt: true },
      })
      .catch(() => []),
  ]);

  for (const id of uniqueIds) {
    result.set(id, emptyExecutionStats());
  }

  const merge = (
    id: string,
    count: number,
    lastAt: Date | null | undefined,
  ) => {
    const cur = result.get(id) ?? emptyExecutionStats();
    cur.totalCount += count;
    if (lastAt && (!cur.lastExecutionAt || lastAt > cur.lastExecutionAt)) {
      cur.lastExecutionAt = lastAt;
    }
    result.set(id, cur);
  };

  for (const row of bookings) {
    merge(row.mediaId, row._count._all, row._max.endsAt);
  }
  for (const row of executions) {
    merge(row.mediaId, row._count._all, row._max.periodEnd);
  }
  for (const row of instant) {
    merge(row.mediaId, row._count._all, row._max.updatedAt);
  }

  for (const [id, stats] of result) {
    stats.monthsSinceLast = stats.lastExecutionAt
      ? monthsSince(stats.lastExecutionAt)
      : null;
    result.set(id, stats);
  }

  return result;
}

async function fetchOwnerResponseMinutesByMediaIds(
  ids: string[],
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (!isDatabaseConfigured() || ids.length === 0) return out;

  const db = getPrisma();
  const medias = await db.media
    .findMany({
      where: { id: { in: ids }, ownerUserId: { not: null } },
      select: { id: true, ownerUserId: true },
    })
    .catch(() => []);

  const ownerIds = [
    ...new Set(medias.map((m) => m.ownerUserId).filter(Boolean)),
  ] as string[];

  const stats = ownerIds.length
    ? await db.mediaOwnerStats
        .findMany({
          where: { ownerUserId: { in: ownerIds } },
          select: { ownerUserId: true, avgResponseMinutes: true },
        })
        .catch(() => [])
    : [];

  const byOwner = new Map(
    stats.map((s) => [s.ownerUserId, s.avgResponseMinutes]),
  );
  for (const m of medias) {
    if (m.ownerUserId) {
      out.set(m.id, byOwner.get(m.ownerUserId) ?? null);
    }
  }
  return out;
}

/** 완료 캠페인 현장 인증 사진 — 매체별 건수 */
export async function fetchCertifiedPhotoCountsByMediaIds(
  ids: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const id of ids) out.set(id, 0);
  if (!isDatabaseConfigured() || ids.length === 0) return out;

  const db = getPrisma();
  const bookings = await db.mediaBooking
    .findMany({
      where: {
        mediaId: { in: ids },
        status: "confirmed",
        campaign: {
          status: "completed",
          proofPhotos: { some: {} },
        },
      },
      select: {
        mediaId: true,
        media: { select: { name: true } },
        campaign: {
          select: {
            proofPhotos: { select: { id: true, mediaName: true } },
          },
        },
      },
    })
    .catch(() => []);

  for (const b of bookings) {
    if (!b.campaign) continue;
    const proofs = b.campaign.proofPhotos;
    const mediaName = b.media?.name ?? "";
    const matched = proofs.filter(
      (p) => !p.mediaName?.trim() || p.mediaName === mediaName,
    );
    const count = matched.length > 0 ? matched.length : proofs.length;
    if (count > 0) {
      out.set(b.mediaId, (out.get(b.mediaId) ?? 0) + count);
    }
  }
  return out;
}

export async function attachMediaTrustToMediaItems(
  items: MediaItem[],
): Promise<MediaItem[]> {
  if (items.length === 0) return items;

  const ids = items.map((m) => m.id);
  const [ctx, execMap, responseMap, certifiedMap] = await Promise.all([
    fetchTrustBadgeContext(),
    fetchExecutionStatsByMediaIds(ids),
    fetchOwnerResponseMinutesByMediaIds(ids),
    fetchCertifiedPhotoCountsByMediaIds(ids),
  ]);

  return items.map((item) => {
    const executionRaw = execMap.get(item.id) ?? emptyExecutionStats();
    const execution = resolvePublicExecutionStats(item.id, executionRaw, item);
    const certifiedPhotoCount = certifiedMap.get(item.id) ?? 0;
    const trustBadges = computeTrustBadges(
      item,
      ctx,
      execution,
      certifiedPhotoCount,
    );
    const trustScore = computeTrustScore(
      item,
      execution,
      responseMap.get(item.id),
    );
    return {
      ...item,
      trustBadges,
      trustScore,
      executionCount: execution.totalCount,
      lastExecutionMonthsAgo: execution.monthsSinceLast,
      performanceGuaranteed: false,
    };
  });
}

export async function enrichMediaWithTrust(
  media: MediaItem,
): Promise<MediaItem> {
  const [enriched] = await attachMediaTrustToMediaItems([media]);
  return enriched;
}

/** 홈 섹션 등 — 이미 trust 가 붙은 full catalog 에서 메타 복사 */
export function mergeMediaTrustFromCatalog(
  items: MediaItem[],
  catalog: MediaItem[],
): MediaItem[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  return items.map((item) => {
    const src = byId.get(item.id);
    if (!src) return item;
    return {
      ...item,
      trustScore: src.trustScore,
      trustBadges: src.trustBadges,
      executionCount: src.executionCount,
      lastExecutionMonthsAgo: src.lastExecutionMonthsAgo,
      averageRating: src.averageRating ?? item.averageRating,
      reviewCount: src.reviewCount ?? item.reviewCount,
    };
  });
}
