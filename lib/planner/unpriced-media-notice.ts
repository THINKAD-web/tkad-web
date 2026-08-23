/**
 * 단가 미등록(₩0) 매체 안내 — 표시 총액에 협의 단가가 빠질 수 있음을 알린다.
 *
 * `formatExportBudgetWonLabel` 이 개별 셀을 「가격 문의」로 바꿔도,
 * 헤더·합계는 0원 기준이라 광고주가 「이 금액이 전부」로 오해할 수 있다.
 * 해당 매체가 하나라도 있으면 보고서에 이 각주를 붙인다.
 */

import type { MediaItem } from "@/lib/media-data";
import { plannerMonthlyPriceWonForMedia } from "@/lib/planner/planner-media-quantity";

export type UnpricedMediaNotice = {
  text: string;
  affectedMediaIds: string[];
};

export function portfolioHasUnpricedMedia(
  portfolio: readonly MediaItem[],
): boolean {
  return portfolio.some((m) => plannerMonthlyPriceWonForMedia(m) <= 0);
}

export function buildUnpricedMediaNotice(args: {
  portfolio: readonly MediaItem[];
  isKo: boolean;
}): UnpricedMediaNotice | undefined {
  const affected = args.portfolio.filter(
    (m) => plannerMonthlyPriceWonForMedia(m) <= 0,
  );
  if (affected.length === 0) return undefined;

  const { isKo } = args;
  const scope =
    affected.length === args.portfolio.length
      ? isKo
        ? "이 구성의 매체는"
        : "All media in this plan require"
      : isKo
        ? `이 구성 중 ${affected.length}개 매체는`
        : `${affected.length} of the media in this plan require`;

  const text = isKo
    ? `${scope} 단가 협의가 필요합니다. 표시된 총액·배분에는 해당 매체 금액이 포함되지 않을 수 있습니다.`
    : `${scope} negotiated pricing. Totals and allocations shown may exclude those amounts.`;

  return {
    text,
    affectedMediaIds: affected.map((m) => m.id),
  };
}
