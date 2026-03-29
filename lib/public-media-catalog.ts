import type { Media } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  getMediaById,
  mediaData,
  type MediaItem,
} from "@/lib/media-data";

/** Map Prisma row → public `MediaItem` (list/detail/compare). */
export function prismaMediaToMediaItem(m: Media): MediaItem {
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
    features: m.effectMemo ?? m.description ?? undefined,
    featuresEn: m.effectMemo ?? m.description ?? undefined,
    dailyExposure:
      m.impressions != null ? String(m.impressions) : undefined,
    sampleImages: imgs.length > 0 ? imgs : [],
    operatingHours: m.operatingHours ?? undefined,
    operatingHoursEn: m.operatingHours ?? undefined,
    installYear: undefined,
    advertiserHistory: undefined,
    advertiserHistoryEn: undefined,
    nearbyFacilities: undefined,
    nearbyFacilitiesEn: undefined,
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
    });
    return row ? prismaMediaToMediaItem(row) : null;
  } catch {
    return null;
  }
}
