import type { MediaItem } from "@/lib/media-data";
import { mediaMonthlyPriceWon } from "@/lib/media-price-transparency";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

export type MediaDiscountResult = {
  discountPct: number;
  avgPriceWon: number;
  mediaPriceWon: number;
  peerCount: number;
};

/**
 * 비교 기준:
 * 1. 같은 region + 같은 type 매체
 * 2. 최소 3개 이상 비교 대상 필요
 * 3. 10% 이상 할인일 때만 뱃지 표시
 * 4. 평균 = (peer 매체 가격 합계) / 개수
 */
export function calculateDiscountFromCatalog(
  media: Pick<MediaItem, "id" | "region" | "type" | "price">,
  catalog: readonly MediaItem[],
): MediaDiscountResult | null {
  const priceWon = mediaMonthlyPriceWon(media as MediaItem);
  if (priceWon <= 0) return null;

  const peers = catalog.filter(
    (m) =>
      m.id !== media.id &&
      m.region === media.region &&
      m.type === media.type &&
      mediaMonthlyPriceWon(m) > 0,
  );
  if (peers.length < 3) return null;

  const peerPrices = peers.map((p) => mediaMonthlyPriceWon(p));
  const avgPriceWon =
    peerPrices.reduce((sum, p) => sum + p, 0) / peerPrices.length;
  if (priceWon >= avgPriceWon) return null;

  const discountPct = Math.round((1 - priceWon / avgPriceWon) * 100);
  if (discountPct < 10) return null;

  return {
    discountPct,
    avgPriceWon,
    mediaPriceWon: priceWon,
    peerCount: peers.length,
  };
}

export async function calculateMediaDiscount(
  mediaId: string,
  region: string,
  type: string,
  priceWon: number,
): Promise<MediaDiscountResult | null> {
  if (priceWon <= 0 || !isDatabaseConfigured()) return null;

  const db = getPrisma();
  const peers = await db.media.findMany({
    where: publicActiveMediaWhere({
      region,
      type,
      id: { not: mediaId },
      price: { gt: 0 },
    }),
    select: { price: true },
  });

  if (peers.length < 3) return null;

  const peerPrices = peers.map((p) => p.price);
  const avgPriceWon =
    peerPrices.reduce((sum, p) => sum + p, 0) / peerPrices.length;

  if (priceWon >= avgPriceWon) return null;

  const discountPct = Math.round((1 - priceWon / avgPriceWon) * 100);
  if (discountPct < 10) return null;

  return {
    discountPct,
    avgPriceWon,
    mediaPriceWon: priceWon,
    peerCount: peers.length,
  };
}

export function formatDiscountBadgeKo(result: MediaDiscountResult): string {
  return `평균 대비 ${result.discountPct}% 저렴`;
}

export function formatDiscountBadgeEn(result: MediaDiscountResult): string {
  return `${result.discountPct}% below area avg`;
}

export function formatDiscountDetailKo(result: MediaDiscountResult): string {
  const avgMan = Math.round(result.avgPriceWon / 10_000);
  const priceMan = Math.round(result.mediaPriceWon / 10_000);
  return `평균 ₩${avgMan.toLocaleString("ko-KR")}만 → ₩${priceMan.toLocaleString("ko-KR")}만 (${result.discountPct}% 저렴)`;
}
