import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { MediaEngagementMap, MediaEngagementStats } from "@/lib/admin-media-engagement";

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

export async function loadMediaEngagementForIds(
  mediaIds: string[],
): Promise<MediaEngagementMap> {
  if (!isDatabaseConfigured() || mediaIds.length === 0) return {};

  const db = getPrisma();
  const idSet = new Set(mediaIds);
  const map: MediaEngagementMap = {};

  const bump = (id: string, field: keyof MediaEngagementStats, n = 1) => {
    if (!idSet.has(id)) return;
    if (!map[id]) {
      map[id] = { viewCount: 0, favoriteCount: 0, inquiryCount: 0 };
    }
    map[id][field] += n;
  };

  const [recentViews, favorites, quotes, bookingRequests] = await Promise.all([
    db.userRecentlyViewedMedia.groupBy({
      by: ["mediaId"],
      where: { mediaId: { in: mediaIds } },
      _count: { _all: true },
    }),
    db.userFavoriteMedia.groupBy({
      by: ["mediaId"],
      where: { mediaId: { in: mediaIds } },
      _count: { _all: true },
    }),
    db.quoteRequest.findMany({
      select: { mediaIds: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    db.mediaBooking.groupBy({
      by: ["mediaId"],
      where: {
        mediaId: { in: mediaIds },
        status: "requested",
      },
      _count: { _all: true },
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
  for (const row of bookingRequests) {
    bump(row.mediaId, "inquiryCount", row._count._all);
  }

  return map;
}
