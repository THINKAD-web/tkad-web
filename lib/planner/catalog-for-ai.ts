import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";

export type PlannerAiCatalogRow = {
  id: string;
  name: string;
  nameEn: string;
  region: string;
  type: string;
  location: string;
  priceManMonth: number;
  monthlyImpressions: number;
  visibilityScore: number;
  targetAge?: string;
  isVerified: boolean;
};

export function buildPlannerAiCatalogPayload(
  catalog: MediaItem[],
  maxItems = 120,
): PlannerAiCatalogRow[] {
  return catalog.slice(0, maxItems).map((m) => {
    const monthlyImpressions =
      m.impressions ??
      m.monthlyFootTraffic ??
      (m.dailyFootTraffic > 0 ? Math.round(m.dailyFootTraffic * 30) : 0);
    return {
      id: m.id,
      name: m.name,
      nameEn: m.nameEn || m.name,
      region: m.region,
      type: m.type,
      location: m.location,
      priceManMonth: catalogPriceFieldToPriceMan(m.price ?? 0),
      monthlyImpressions,
      visibilityScore: m.visibilityScore ?? 0,
      targetAge: m.targetAge,
      isVerified: m.isVerified ?? false,
    };
  });
}
