import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";

export type V1MediaListItem = {
  id: string;
  name: string;
  type: string;
  region: string;
  price: number;
  impressions: number | null;
  lat: number;
  lng: number;
  thumbnailUrl: string | null;
  isAvailable: boolean;
};

export type V1MediaDetail = V1MediaListItem & {
  location: string;
  city: string | null;
  district: string | null;
  subCategory: string | null;
  pricePeriod: string | null;
  dailyFootTraffic: number | null;
  visibilityScore: number | null;
  availability: string | null;
};

export function mediaItemToV1ListItem(m: MediaItem): V1MediaListItem | null {
  const lat = Number(m.lat);
  const lng = Number(m.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  const thumb = m.sampleImages?.[0]?.trim() || null;

  return {
    id: m.id,
    name: m.name,
    type: m.type,
    region: m.region,
    price: catalogPriceFieldToWon(m.price ?? 0),
    impressions: m.impressions ?? m.monthlyFootTraffic ?? null,
    lat,
    lng,
    thumbnailUrl: thumb,
    isAvailable: (m.availability ?? "available") === "available",
  };
}

export function mediaItemToV1Detail(m: MediaItem): V1MediaDetail | null {
  const base = mediaItemToV1ListItem(m);
  if (!base) return null;

  return {
    ...base,
    location: m.location,
    city: m.city ?? null,
    district: m.district ?? null,
    subCategory: m.subCategory ?? null,
    pricePeriod: m.pricePeriod ?? null,
    dailyFootTraffic: m.dailyFootTraffic ?? null,
    visibilityScore: m.visibilityScore ?? null,
    availability: m.availability ?? null,
  };
}

export function filterV1MediaList(
  items: MediaItem[],
  filters: {
    region?: string | null;
    type?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    available?: boolean | null;
  },
): V1MediaListItem[] {
  const region = filters.region?.trim() || null;
  const type = filters.type?.trim() || null;

  return items
    .filter((m) => {
      if (type && m.type !== type) return false;
      if (
        region &&
        m.region !== region &&
        m.city !== region &&
        m.district !== region
      ) {
        return false;
      }
      const priceWon = catalogPriceFieldToWon(m.price ?? 0);
      if (filters.minPrice != null && priceWon < filters.minPrice) return false;
      if (filters.maxPrice != null && priceWon > filters.maxPrice) return false;
      if (filters.available === true && m.availability !== "available") {
        return false;
      }
      if (filters.available === false && m.availability === "available") {
        return false;
      }
      return true;
    })
    .map(mediaItemToV1ListItem)
    .filter((row): row is V1MediaListItem => row != null);
}

export function parseV1Pagination(
  searchParams: URLSearchParams,
): { page: number; limit: number } {
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
    : 20;
  return { page, limit };
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { data: T[]; pagination: { total: number; page: number; limit: number } } {
  const total = items.length;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, pagination: { total, page, limit } };
}
