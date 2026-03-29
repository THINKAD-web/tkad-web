import type { Media, MediaAdvertiserExecution } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  getMediaById,
  mediaData,
  type MediaItem,
} from "@/lib/media-data";

/** Catalog/detail 쿼리용: 집행 이력으로 광고주 문자열 생성 */
export type MediaWithAdvertiserExecutions = Media & {
  advertiserExecutions?: Pick<MediaAdvertiserExecution, "advertiserName">[];
};

function buildPastAdvertisersFromExecutions(
  executions: Pick<MediaAdvertiserExecution, "advertiserName">[] | undefined,
): string | undefined {
  if (!executions?.length) return undefined;
  const seen = new Set<string>();
  const names: string[] = [];
  for (const e of executions) {
    const n = e.advertiserName.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    names.push(n);
  }
  return names.length ? names.join(", ") : undefined;
}

/** nearby_facilities + stations + landmarks 를 비교·목록용 한 줄로 */
function buildNearbyFacilitiesDisplay(m: Media): string | undefined {
  const parts = [m.nearbyFacilities, m.nearbyStations, m.nearbyLandmarks]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

/** Map Prisma row → public `MediaItem` (list/detail/compare). */
export function prismaMediaToMediaItem(m: MediaWithAdvertiserExecutions): MediaItem {
  const lat = m.latitude ?? 37.5665;
  const lng = m.longitude ?? 126.978;
  const daily = m.dailyFootfall ?? 0;
  const imgs = [...(m.image ? [m.image] : []), ...m.extractedImages].filter(
    Boolean,
  );

  const size =
    m.width && m.height
      ? `${m.width} × ${m.height}`
      : m.widthM != null && m.heightM != null
        ? `${m.widthM}m × ${m.heightM}m`
        : undefined;

  const locationEn =
    [m.district, m.city].filter(Boolean).join(", ") || m.location;

  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn ?? m.name,
    location: m.location,
    locationEn,
    region: m.region,
    type: m.type,
    price: m.price,
    lat,
    lng,
    dailyFootTraffic: daily,
    monthlyFootTraffic: m.impressions ?? undefined,
    size,
    resolution: m.resolution ?? undefined,
    brightness: undefined,
    targetAge: m.targetAge ?? undefined,
    visibilityScore: m.visibilityScore,
    features: m.effectMemo ?? m.description ?? undefined,
    featuresEn: m.effectMemo ?? m.description ?? undefined,
    dailyExposure:
      m.impressions != null ? String(m.impressions) : undefined,
    sampleImages: imgs.length > 0 ? imgs : [],
    operatingHours: m.operatingHours ?? undefined,
    operatingHoursEn: m.operatingHours ?? undefined,
    installYear: undefined,
    ...(() => {
      const manual = m.pastAdvertisers?.trim() || undefined;
      const fromExec = buildPastAdvertisersFromExecutions(m.advertiserExecutions);
      const line = manual || fromExec;
      return {
        advertiserHistory: line,
        advertiserHistoryEn: line,
      };
    })(),
    nearbyFacilities: buildNearbyFacilitiesDisplay(m),
    nearbyFacilitiesEn: buildNearbyFacilitiesDisplay(m),
    caseStudyPhotos: undefined,
  };
}

/**
 * Active media for public browse. Uses DB when configured and non-empty;
 * otherwise falls back to `mediaData` samples.
 */
export async function fetchPublicMediaCatalog(): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) {
    return mediaData;
  }
  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: {
        advertiserExecutions: {
          select: { advertiserName: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (rows.length === 0) {
      return mediaData;
    }
    return rows.map(prismaMediaToMediaItem);
  } catch {
    return mediaData;
  }
}

/** Detail: static catalog first, then DB by cuid (active only). */
export async function resolveMediaForDetail(
  id: string,
): Promise<MediaItem | null> {
  const fromStatic = getMediaById(id);
  if (fromStatic) return fromStatic;
  if (!isDatabaseConfigured()) return null;
  try {
    const db = getPrisma();
    const row = await db.media.findFirst({
      where: { id, isActive: true },
      include: {
        advertiserExecutions: {
          select: { advertiserName: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return row ? prismaMediaToMediaItem(row) : null;
  } catch {
    return null;
  }
}
