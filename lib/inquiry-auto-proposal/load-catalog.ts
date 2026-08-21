import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ProposalCatalogRow } from "./match-and-options";

function pricePeriod(raw: string | null | undefined): MediaPricePeriodKey {
  if (raw === "week" || raw === "day" || raw === "biweekly") return raw;
  return "month";
}

export function prismaRowToProposalCatalog(
  row: {
    id: string;
    name: string;
    nameEn: string | null;
    location: string;
    locationEn: string | null;
    region: string;
    type: string;
    price: number;
    pricePeriod: string;
    priceNote: string | null;
    description: string | null;
    priceOptions: unknown;
    impressions: number | null;
    dailyFootfall: number | null;
    cpm: number | null;
    reviewStatus: string;
    isActive: boolean;
    country: string;
    subCategory: string | null;
    mediaMainCategory: string | null;
    mediaSubCategory: string | null;
    regionSub: string | null;
    widthM: number | null;
    heightM: number | null;
    slug: string | null;
  },
): ProposalCatalogRow {
  const item: MediaItem = {
    id: row.id,
    slug: row.slug?.trim() || undefined,
    name: row.name,
    nameEn: row.nameEn?.trim() || row.name,
    location: row.location,
    locationEn: row.locationEn?.trim() || row.location,
    region: row.region,
    type: row.type,
    price: row.price,
    pricePeriod: pricePeriod(row.pricePeriod),
    lat: 0,
    lng: 0,
    dailyFootTraffic: row.dailyFootfall ?? 0,
    impressions: row.impressions ?? undefined,
    monthlyFootTraffic: row.impressions ?? undefined,
    cpm: row.cpm ?? undefined,
    mediaMainCategory: row.mediaMainCategory ?? undefined,
    mediaSubCategory: row.mediaSubCategory ?? undefined,
    subCategory: row.subCategory ?? undefined,
    regionSub: row.regionSub ?? undefined,
    country: row.country,
    widthM: row.widthM ?? undefined,
    heightM: row.heightM ?? undefined,
    sampleImages: [],
    description: row.description ?? undefined,
  };
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    reviewStatus: row.reviewStatus,
    type: row.type,
    mediaMainCategory: row.mediaMainCategory,
    mediaSubCategory: row.mediaSubCategory,
    subCategory: row.subCategory,
    price: row.price,
    impressions: row.impressions,
    dailyFootfall: row.dailyFootfall,
    cpm: row.cpm,
    priceNote: row.priceNote,
    description: row.description,
    priceOptions: row.priceOptions,
    widthM: row.widthM,
    heightM: row.heightM,
    location: row.location,
    regionSub: row.regionSub,
    item,
  };
}

/** 활성 KR Media 만. 네트워크 병합 없음. flagged 는 포함해 dry-run 제외 목록에 보여 준다. */
export async function loadProposalCatalog(): Promise<ProposalCatalogRow[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getPrisma();
  const rows = await db.media.findMany({
    where: { isActive: true, country: "KR" },
    select: {
      id: true,
      name: true,
      nameEn: true,
      location: true,
      locationEn: true,
      region: true,
      type: true,
      price: true,
      pricePeriod: true,
      priceNote: true,
      description: true,
      priceOptions: true,
      impressions: true,
      dailyFootfall: true,
      cpm: true,
      reviewStatus: true,
      isActive: true,
      country: true,
      subCategory: true,
      mediaMainCategory: true,
      mediaSubCategory: true,
      regionSub: true,
      widthM: true,
      heightM: true,
      slug: true,
    },
  });
  return rows.map((r) =>
    prismaRowToProposalCatalog({
      ...r,
      pricePeriod: String(r.pricePeriod),
    }),
  );
}
