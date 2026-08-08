/**
 * 견적 링크 파라미터 — 계산 결과에서 직접 유도한다 (D-06).
 *
 * 현재 프로덕션은 7일 상품인 M-CITY 에 `period=1day` 를 실어 보내고,
 * 버스 상세는 `po=4&period=30days` 라는 다른 스키마를 쓴다. 문자열
 * 하드코딩을 없애고 **실제 적용된 상품**에서 파라미터를 만든다.
 *
 * 여기서는 파라미터 값만 순수 계산으로 만든다. 실제 URL 조립은
 * PR-5 에서 `lib/quote-deeplink.ts` 에 연결한다.
 */
import { PARTIAL_PERIOD_RATE_DAYS } from "@/lib/media-partial-period-rates";
import { resolvePrice } from "./price";
import type { PriceOption, PriceResult } from "./types";

export type QuoteParams = {
  media: string;
  /** 실제 적용된 상품의 식별자 (없으면 생략) */
  optionId?: string;
  /** 집행 일수 — 문자열 period 대신 이것이 정본 */
  days: number;
  /** 운영 6키 중 하나로 정확히 떨어질 때만 채운다 (레거시 호환용) */
  period?: string;
  priceWon: number;
  /** true 면 견적 화면에 "추정값" 배지 노출 */
  isEstimate: boolean;
};

const DAYS_TO_PERIOD_KEY = new Map<number, string>(
  Object.entries(PARTIAL_PERIOD_RATE_DAYS).map(([key, days]) => [days, key]),
);

/**
 * 일수를 운영 표준 period 키로. 정확히 대응하는 키가 없으면 undefined —
 * 임의로 가장 가까운 키를 붙이면 D-06 을 그대로 재현하게 된다.
 */
export function daysToPeriodKey(days: number): string | undefined {
  return DAYS_TO_PERIOD_KEY.get(days);
}

/** 매체 + 요청 기간 → 견적 링크 파라미터 */
export function buildQuoteParams(params: {
  mediaId: string;
  priceOptions: readonly PriceOption[];
  days: number;
}): QuoteParams | null {
  const price: PriceResult | null = resolvePrice(
    params.priceOptions,
    params.days,
  );
  if (!price) return null;

  // 확정 상품이 잡혔으면 그 상품의 일수를, 아니면 요청 일수를 그대로 쓴다.
  const days = price.option?.days ?? params.days;

  return {
    media: params.mediaId,
    optionId: price.option?.id,
    days,
    period: daysToPeriodKey(days),
    priceWon: price.amount,
    isEstimate: price.isEstimate,
  };
}
