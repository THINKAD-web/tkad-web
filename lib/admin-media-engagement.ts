import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type MediaEngagementStats = {
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
};

export type MediaEngagementMap = Record<string, MediaEngagementStats>;

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

/** 매체별 조회(최근본)·찜·견적문의 집계 */
export async function loadMediaEngagementMap(): Promise<MediaEngagementMap> {
  if (!isDatabaseConfigured()) return {};

  const db = getPrisma();
  const map: MediaEngagementMap = {};

  const bump = (id: string, field: keyof MediaEngagementStats, n = 1) => {
    if (!map[id]) {
      map[id] = { viewCount: 0, favoriteCount: 0, inquiryCount: 0 };
    }
    map[id][field] += n;
  };

  const [recentViews, favorites, quotes] = await Promise.all([
    db.userRecentlyViewedMedia.groupBy({
      by: ["mediaId"],
      _count: { _all: true },
    }),
    db.userFavoriteMedia.groupBy({
      by: ["mediaId"],
      _count: { _all: true },
    }),
    db.quoteRequest.findMany({
      select: { mediaIds: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  for (const row of recentViews) {
    bump(row.mediaId, "viewCount", row._count._all);
  }
  for (const row of favorites) {
    bump(row.mediaId, "favoriteCount", row._count._all);
  }
  for (const q of quotes) {
    for (const id of parseMediaIds(q.mediaIds)) {
      bump(id, "inquiryCount", 1);
    }
  }

  return map;
}
