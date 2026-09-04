import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  estimatePerformance,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";

/** OOH/DOOH catalog rows for proposal prompts — unchanged field set from legacy block. */
export function buildOohCatalogBlock(media: MediaItem[]): string {
  return media
    .map((m) => {
      const won = catalogPriceFieldToWon(m.price);
      return [
        `id=${m.id}`,
        `name=${m.name}`,
        `type=${m.type}`,
        `region=${m.region}`,
        `district=${m.district ?? ""}`,
        `priceWon=${won}`,
        `period=${m.pricePeriod ?? "month"}`,
        `footTraffic=${m.dailyFootTraffic ?? "n/a"}`,
        `visibility=${m.visibilityScore ?? "n/a"}`,
      ].join(" | ");
    })
    .join("\n");
}

export function buildOnlineCatalogBlock(
  media: MediaItem[],
  budgetByMediaId?: ReadonlyMap<string, number>,
  calculableByMediaId?: ReadonlyMap<string, boolean>,
): string {
  return media
    .map((m) => {
      const spec = m.onlineSpec;
      const budgetWon = budgetByMediaId?.get(m.id);
      const calculable = calculableByMediaId?.get(m.id) ?? true;
      const est =
        spec && budgetWon != null && budgetWon > 0 && calculable
          ? estimatePerformance(spec, budgetWon)
          : null;
      const reachSummary =
        est?.reachMin != null && est?.reachMax != null
          ? `${est.reachMin}~${est.reachMax}`
          : "n/a";
      const clicksSummary =
        est?.clicksMin != null && est?.clicksMax != null
          ? `${est.clicksMin}~${est.clicksMax}`
          : "n/a";
      return [
        `id=${m.id}`,
        `name=${m.name}`,
        `platform=${spec?.platform ?? "n/a"}`,
        `category=${m.mediaMainCategory ?? "n/a"}`,
        `minBudgetWon=${spec?.minBudget ?? "n/a"}`,
        `pricing=${spec ? onlinePricingLabel(spec) : "inquiry"}`,
        `allocatedBudgetWon=${budgetWon ?? "n/a"}`,
        `estReach=${reachSummary}`,
        `estClicks=${clicksSummary}`,
      ].join(" | ");
    })
    .join("\n");
}
