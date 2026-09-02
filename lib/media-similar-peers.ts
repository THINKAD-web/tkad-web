import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import {
  dedupeImageUrls,
  type MediaItem,
  type MediaPriceOption,
  type MediaPricePeriodKey,
} from "@/lib/media-data";
import { getMediaBrowseMockCatalog } from "@/lib/media-browse-catalog";
import {
  filterDisplayableMediaImageUrls,
  resolveCatalogImageSrc,
} from "@/lib/optimized-image-url";

export const SIMILAR_MEDIA_PEERS_DEFAULT_LIMIT = 64;
/** Same-region pool below this count expands to all regions. */
export const SIMILAR_MEDIA_PEERS_REGION_MIN = 16;

const SIMILAR_MEDIA_PEER_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameEn: true,
  type: true,
  price: true,
  pricePeriod: true,
  priceOptions: true,
  image: true,
  extractedImages: true,
  latitude: true,
  longitude: true,
  region: true,
  regionZone: true,
  visibilityScore: true,
  popularityScore: true,
  impressions: true,
  dailyFootfall: true,
} as const;

type SimilarMediaPeerRow = Prisma.MediaGetPayload<{
  select: typeof SIMILAR_MEDIA_PEER_SELECT;
}>;

function popularityDesc<T extends { popularityScore?: number | null }>(
  a: T,
  b: T,
): number {
  return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
}

/**
 * Region-first peer pool. If same-region count is below REGION_MIN, keep those
 * rows and fill the rest from other regions (do not replace the region set).
 * Always popularityScore DESC within each tier, capped at `limit`.
 */
export function pickSimilarMediaPeerPool<
  T extends { id: string; region: string; popularityScore?: number | null },
>(
  candidates: readonly T[],
  current: Pick<MediaItem, "id" | "region">,
  limit = SIMILAR_MEDIA_PEERS_DEFAULT_LIMIT,
): T[] {
  const others = candidates.filter((m) => m.id !== current.id);
  const regional = others
    .filter((m) => m.region === current.region)
    .slice()
    .sort(popularityDesc);
  if (regional.length >= SIMILAR_MEDIA_PEERS_REGION_MIN) {
    return regional.slice(0, limit);
  }
  const seen = new Set(regional.map((m) => m.id));
  const fill = others
    .filter((m) => !seen.has(m.id))
    .slice()
    .sort(popularityDesc);
  return [...regional, ...fill].slice(0, limit);
}

function normalizePricePeriod(
  v: string | null | undefined,
): MediaPricePeriodKey | undefined {
  if (v === "biweekly" || v === "week" || v === "day" || v === "month") {
    return v;
  }
  return undefined;
}

function slimPriceOptions(raw: unknown): MediaPriceOption[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!Array.isArray(arr)) return undefined;
    const out: MediaPriceOption[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.label !== "string") continue;
      if (typeof row.price !== "number") continue;
      const period = normalizePricePeriod(
        typeof row.period === "string" ? row.period : undefined,
      );
      out.push({
        label: row.label,
        price: row.price,
        ...(period ? { period } : {}),
        ...(typeof row.description === "string" && row.description.trim()
          ? { description: row.description.trim() }
          : {}),
      });
    }
    return out.length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

function peerThumbUrl(
  image: string | null | undefined,
  extractedImages: string[] | null | undefined,
): string | undefined {
  const urls = filterDisplayableMediaImageUrls(
    dedupeImageUrls(
      [image, ...(extractedImages ?? [])].filter(
        (x): x is string => typeof x === "string" && Boolean(x.trim()),
      ),
    ),
  );
  const resolved = urls[0] ? resolveCatalogImageSrc(urls[0]) : null;
  return resolved?.src;
}

/** Card/sort/competitor fields only — do not attach descriptions or traffic blobs. */
export function toSimilarMediaPeerItem(m: MediaItem): MediaItem {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    nameEn: m.nameEn,
    location: "",
    locationEn: "",
    region: m.region,
    regionZone: m.regionZone,
    type: m.type,
    price: m.price,
    pricePeriod: m.pricePeriod,
    priceOptions: m.priceOptions,
    lat: m.lat,
    lng: m.lng,
    dailyFootTraffic: m.dailyFootTraffic ?? 0,
    impressions: m.impressions,
    monthlyFootTraffic: m.impressions ?? m.monthlyFootTraffic,
    visibilityScore: m.visibilityScore,
    popularityScore: m.popularityScore,
    sampleImages: m.sampleImages?.slice(0, 1) ?? [],
  };
}

function peerRowToMediaItem(row: SimilarMediaPeerRow): MediaItem {
  const thumb = peerThumbUrl(row.image, row.extractedImages);
  return {
    id: row.id,
    slug: row.slug?.trim() || undefined,
    name: row.name,
    nameEn: row.nameEn?.trim() || row.name,
    location: "",
    locationEn: "",
    region: row.region,
    regionZone: row.regionZone?.trim() || undefined,
    type: row.type,
    price: row.price,
    pricePeriod: normalizePricePeriod(row.pricePeriod),
    priceOptions: slimPriceOptions(row.priceOptions),
    lat: row.latitude ?? 0,
    lng: row.longitude ?? 0,
    dailyFootTraffic: row.dailyFootfall ?? 0,
    impressions: row.impressions ?? undefined,
    monthlyFootTraffic: row.impressions ?? undefined,
    visibilityScore: row.visibilityScore ?? undefined,
    popularityScore: row.popularityScore ?? 0,
    sampleImages: thumb ? [thumb] : [],
  };
}

async function loadSimilarMediaPeerRows(
  current: Pick<MediaItem, "id" | "region">,
  limit: number,
): Promise<SimilarMediaPeerRow[]> {
  const db = getPrisma();
  const orderBy: Prisma.MediaOrderByWithRelationInput[] = [
    { popularityScore: "desc" },
  ];
  const regional = await db.media.findMany({
    where: publicActiveMediaWhere({
      id: { not: current.id },
      region: current.region,
    }),
    orderBy,
    take: limit,
    select: SIMILAR_MEDIA_PEER_SELECT,
  });
  if (regional.length >= SIMILAR_MEDIA_PEERS_REGION_MIN) {
    return regional;
  }
  const fill = await db.media.findMany({
    where: publicActiveMediaWhere({
      id: {
        notIn: [current.id, ...regional.map((row) => row.id)],
      },
    }),
    orderBy,
    take: Math.max(0, limit - regional.length),
    select: SIMILAR_MEDIA_PEER_SELECT,
  });
  return [...regional, ...fill];
}

/**
 * Detail-page similar/competitor pool. Region first, relax if thin, slim columns.
 */
export const fetchSimilarMediaPeers = cache(
  async function fetchSimilarMediaPeers(
    media: Pick<MediaItem, "id" | "region">,
    opts?: { limit?: number },
  ): Promise<MediaItem[]> {
    const limit = opts?.limit ?? SIMILAR_MEDIA_PEERS_DEFAULT_LIMIT;
    const forceMockOnly =
      process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "1" ||
      process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "true";

    if (!isDatabaseConfigured() || forceMockOnly) {
      return pickSimilarMediaPeerPool(
        getMediaBrowseMockCatalog(),
        media,
        limit,
      ).map(toSimilarMediaPeerItem);
    }

    try {
      const rows = await loadSimilarMediaPeerRows(media, limit);
      return rows.map(peerRowToMediaItem);
    } catch (e) {
      console.error(
        "[fetchSimilarMediaPeers] DB query failed — returning empty peers",
        e instanceof Error ? `${e.name}: ${e.message}` : e,
      );
      return [];
    }
  },
);
