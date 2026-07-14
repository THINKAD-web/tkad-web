import type { MediaItem } from "@/lib/media-data";
import { tryResolveExplicitPriceOptionBundleDays } from "@/lib/compare-quote";

export type PackagePeriodToggleMeta = {
  bundleDays: number;
  periodText: string;
};

/** bundle days가 명시된 priceOption — 견적·plan cart 패키지 기간 토글 노출 조건 */
export function packagePeriodToggleMeta(
  media: MediaItem,
  priceOptionIndex: number,
): PackagePeriodToggleMeta | null {
  const priceOpt = media.priceOptions?.[priceOptionIndex];
  if (!priceOpt) return null;
  const bundleDays = tryResolveExplicitPriceOptionBundleDays(priceOpt);
  if (bundleDays == null) return null;
  const periodText =
    typeof priceOpt.period === "string" && priceOpt.period.trim()
      ? priceOpt.period.trim()
      : String(bundleDays);
  return { bundleDays, periodText };
}

export function planCartItemUsesPackagePeriod(
  item: Pick<
    import("@/lib/plan-cart").PlanCartItem,
    "usePackagePeriod" | "lineCampaignDays"
  >,
): boolean {
  return item.usePackagePeriod === true;
}
