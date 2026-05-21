import type { MediaItem } from "@/lib/media-data";
import {
  computeMediaPriceBenchmark,
  mediaMonthlyPriceWon,
} from "@/lib/media-price-transparency";

export type BestDealItem = MediaItem & {
  dealReason: "price" | "availability" | "new";
  dealLabelKo: string;
  dealLabelEn: string;
  savingsPct?: number;
};

export function pickBestDeals(
  catalog: readonly MediaItem[],
  limit = 8,
): BestDealItem[] {
  const active = [...catalog];
  const deals: BestDealItem[] = [];

  for (const m of active) {
    const price = mediaMonthlyPriceWon(m);
    if (price <= 0) continue;
    const bench = computeMediaPriceBenchmark(m, catalog);
    if (bench && bench.percentVsAvg <= -20) {
      deals.push({
        ...m,
        dealReason: "price",
        dealLabelKo: `평균 대비 ${Math.abs(bench.percentVsAvg)}% 저렴`,
        dealLabelEn: `${Math.abs(bench.percentVsAvg)}% below area avg`,
        savingsPct: Math.abs(bench.percentVsAvg),
      });
    }
  }

  deals.sort((a, b) => (b.savingsPct ?? 0) - (a.savingsPct ?? 0));

  const picked = deals.slice(0, Math.ceil(limit / 2));
  const pickedIds = new Set(picked.map((m) => m.id));

  const avail = active
    .filter(
      (m) =>
        !pickedIds.has(m.id) &&
        m.availability === "available" &&
        mediaMonthlyPriceWon(m) > 0,
    )
    .sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0))
    .slice(0, Math.ceil(limit / 3))
    .map(
      (m): BestDealItem => ({
        ...m,
        dealReason: "availability",
        dealLabelKo: "즉시 집행 가능",
        dealLabelEn: "Available now",
      }),
    );

  const promo = active
    .filter((m) => !pickedIds.has(m.id) && m.tags?.includes("매체사신청"))
    .slice(0, 2)
    .map(
      (m): BestDealItem => ({
        ...m,
        dealReason: "new",
        dealLabelKo: "신규 등록 프로모션",
        dealLabelEn: "New listing promo",
      }),
    );

  return [...picked, ...avail, ...promo].slice(0, limit);
}
