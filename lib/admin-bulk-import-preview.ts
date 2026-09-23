/**
 * bulk-import dry-run / 반영 전 운영자 체크리스트 (PR3).
 */

import type { MediaQuickAddCreate } from "@/lib/media-quick-add";
import {
  getCheapestMediaPriceOption,
  catalogPriceFieldToWon,
} from "@/lib/media-price-format";

export type BulkImportRowPreview = {
  addressVerified: boolean;
  /** 대표 price vs priceOptions 최저가 월환산 불일치 */
  priceAlignmentWarning: string | null;
  /** http(s) URL 형식이 아닌 이미지 */
  invalidImageUrls: string[];
  /** DB에 유사 이름(부분 일치) 매체 — 경고만 */
  similarNameWarnings: string[];
};

function isLikelyHttpUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildBulkImportRowPreview(input: {
  createPayload: MediaQuickAddCreate;
  addressVerified: boolean;
  existingNamesLower: readonly string[];
  mediaName: string;
}): BulkImportRowPreview {
  const { createPayload, addressVerified, existingNamesLower, mediaName } =
    input;

  const invalidImageUrls = (createPayload.extractedImages ?? []).filter(
    (u) => u.trim() && !isLikelyHttpUrl(u.trim()),
  );

  const nameLower = mediaName.trim().toLowerCase();
  const similarNameWarnings: string[] = [];
  for (const other of existingNamesLower) {
    if (other === nameLower) continue;
    if (
      other.includes(nameLower) ||
      nameLower.includes(other) ||
      (nameLower.length >= 4 && other.includes(nameLower.slice(0, 4)))
    ) {
      similarNameWarnings.push(other);
      if (similarNameWarnings.length >= 3) break;
    }
  }

  let priceAlignmentWarning: string | null = null;
  const rootPrice = createPayload.price;
  const cheapest = getCheapestMediaPriceOption({
    price: rootPrice,
    pricePeriod: createPayload.pricePeriod ?? "month",
    priceOptions: createPayload.priceOptions ?? undefined,
  });
  if (cheapest && rootPrice > 0) {
    const rootWon = catalogPriceFieldToWon(rootPrice);
    if (Math.abs(rootWon - cheapest.priceWon) > 1) {
      priceAlignmentWarning = `대표 price(${rootWon.toLocaleString("ko-KR")}원)와 priceOptions 최저 표시가(${cheapest.priceWon.toLocaleString("ko-KR")}원)가 다릅니다. CPM SSOT는 최저 옵션 기준입니다.`;
    }
  }

  return {
    addressVerified,
    priceAlignmentWarning,
    invalidImageUrls,
    similarNameWarnings,
  };
}
