/**
 * 「반달 상품이 없는 매체」 안내 — 표시 금액과 실제 청구액이 갈릴 수 있음을 알린다.
 *
 * 배경. 같은 매체의 14일 금액을 두 함수가 다르게 답한다.
 *
 *   `resolveMediaProductPrice(m, 14)`  → 월정가 전액 (반달은 팔지 않으므로)
 *   `plannerMediaPeriodLineWon(m, ...)` → 월정가 × 14/30 (선형 환산)
 *
 * 어느 쪽이 실제 청구 기준인지는 **매체마다 협상으로** 정해진다. 그래서
 * 시스템이 한쪽으로 단정하지 않는다. 대신
 *
 *   - 보고서 **표시 금액은 선형 환산으로 통일**한다 (지역표·매체 라인·브리프가
 *     이미 전부 그 기준이라, 여기서만 달리 가면 문서 안에서 또 갈린다)
 *   - 갈릴 수 있는 매체가 하나라도 있으면 이 안내를 붙여 상한을 명시한다
 *
 * 엔진의 `MEDIA_NO_PARTIAL_RATE_TIER` 경고와 같은 조건이지만 대상이 다르다 —
 * 경고는 운영자·개발자용(Sentry)이고, 이 문구는 광고주용이다. 경고 코드
 * 문자열이 보고서 본문에 새지 않게 별도로 만든다.
 */

import type { MediaItem } from "@/lib/media-data";
import {
  mediaMinSellableDaysAbove,
  resolveMediaProductPrice,
} from "@/lib/metrics/media-price-adapter";

export type PartialRateNotice = {
  /** 광고주용 각주 문구 */
  text: string;
  /** 최소 판매 단위가 캠페인 기간보다 긴 매체 id */
  affectedMediaIds: string[];
  /**
   * 협의 결과가 가장 불리할 때의 총액(원).
   * 해당 매체는 최소 판매 단위 상품가 전액, 나머지는 표시된 선형 환산액.
   */
  maxBillableWon: number;
};

function formatWon(won: number, isKo: boolean): string {
  if (!isKo) return `KRW ${won.toLocaleString("en-US")}`;
  if (won >= 10_000 && won % 10_000 === 0) {
    return `${(won / 10_000).toLocaleString("ko-KR")}만원`;
  }
  return `${won.toLocaleString("ko-KR")}원`;
}

export function buildPartialRateNotice(args: {
  portfolio: readonly MediaItem[];
  /** 캠페인 일수 */
  days: number;
  /** 매체별 보고서 표시 금액(선형 환산액, 원) */
  displayedLineWonById: Readonly<Record<string, number>>;
  /** 매체별 수량 — 미지정 시 1 */
  unitsById?: Readonly<Record<string, number>>;
  isKo: boolean;
}): PartialRateNotice | undefined {
  const { portfolio, days, displayedLineWonById, unitsById, isKo } = args;
  if (portfolio.length === 0 || !Number.isFinite(days) || days <= 0) {
    return undefined;
  }

  const affected: { media: MediaItem; minDays: number; fullWon: number }[] = [];
  let maxBillableWon = 0;

  for (const m of portfolio) {
    const displayed = displayedLineWonById[m.id] ?? 0;
    const minDays = mediaMinSellableDaysAbove(m, days);
    if (minDays == null) {
      maxBillableWon += displayed;
      continue;
    }
    const units = Math.max(1, Math.round(unitsById?.[m.id] ?? 1));
    const full = (resolveMediaProductPrice(m, minDays)?.amount ?? 0) * units;
    // 협의가 불리하게 끝나도 표시액보다 싸지지는 않는다.
    maxBillableWon += Math.max(displayed, full);
    affected.push({ media: m, minDays, fullWon: full });
  }

  if (affected.length === 0) return undefined;

  const minDaysSet = [...new Set(affected.map((a) => a.minDays))];
  const unitLabel =
    minDaysSet.length === 1 && minDaysSet[0] === 30
      ? isKo
        ? "월 단위로만"
        : "in monthly units only"
      : isKo
        ? `최소 ${minDaysSet.sort((a, b) => a - b).join("·")}일 단위로만`
        : `in minimum units of ${minDaysSet.sort((a, b) => a - b).join("/")} days`;

  const scope =
    affected.length === portfolio.length
      ? isKo
        ? "이 구성의 매체는"
        : "The media in this plan are sold"
      : isKo
        ? `이 구성 중 ${affected.length}개 매체는`
        : `${affected.length} of the media in this plan are sold`;

  const text = isKo
    ? `${scope} ${unitLabel} 판매되어, 표시 금액은 기간 비례로 환산한 값입니다. 실제 청구액은 협의 결과에 따라 최대 ${formatWon(maxBillableWon, true)}까지 달라질 수 있습니다.`
    : `${scope} ${unitLabel}, so the amounts shown are prorated by flight length. Actual billing may rise to ${formatWon(maxBillableWon, false)} depending on negotiation.`;

  return {
    text,
    affectedMediaIds: affected.map((a) => a.media.id),
    maxBillableWon,
  };
}
