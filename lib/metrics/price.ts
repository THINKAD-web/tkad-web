/**
 * 가격 정규화.
 *
 * 절대 금지: `dailyRate × days` 로 장기 단가를 유도하는 것 (D-04).
 * OOH 는 기간이 길수록 단가가 급격히 떨어진다.
 *   M-CITY 실제: 7일 2,500만 / 15일 4,500만 / 30일 **7,000만**
 *   선형 환산:   2,500만 × 4 = **1억**  → 3,000만원(43%) 과다 견적
 */
import { LONG_TERM_DISCOUNT } from "./constants";
import type { PriceOption, PriceResult } from "./types";

/** DB `Media.pricePeriod` / 옵션 period → 상품 일수 */
export const PERIOD_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  biweekly: 14,
  month: 30,
};

/** 기간 키를 일수로. 미상이면 null (임의 추정 금지) */
export function periodToDays(period: string | null | undefined): number | null {
  if (!period) return null;
  const days = PERIOD_DAYS[period];
  return typeof days === "number" ? days : null;
}

function usable(option: PriceOption): boolean {
  return (
    Number.isFinite(option.days) &&
    option.days > 0 &&
    Number.isFinite(option.price) &&
    option.price > 0
  );
}

/** 일수 오름차순 정렬 + 유효 옵션만 (동일 일수는 저가 우선) */
export function normalizePriceOptions(
  options: readonly PriceOption[],
): PriceOption[] {
  return options
    .filter(usable)
    .slice()
    .sort((a, b) => a.days - b.days || a.price - b.price);
}

/**
 * 요청 기간에 대한 가격 산출.
 *
 * 1. 정확히 일치하는 등록 상품 → 확정 단가 (`exact`)
 * 2. 앞뒤 상품 사이 → **로그 보간** (`interpolated`)
 *    선형 보간은 장기 할인 곡선을 반영하지 못해 중간 기간을 과다 산정한다.
 * 3. 최장 상품 초과 → 최장 상품 일할 단가 × 장기 할인 (`extrapolated`)
 *
 * `basis !== "exact"` 면 UI 에 **반드시 "추정값" 배지**를 노출한다.
 * 정확한 숫자인 척하지 않는 것이 신뢰의 핵심이다.
 */
export function resolvePrice(
  priceOptions: readonly PriceOption[],
  days: number,
): PriceResult | null {
  const options = normalizePriceOptions(priceOptions);
  if (options.length === 0) return null;
  if (!Number.isFinite(days) || days <= 0) return null;

  const exact = options.find((o) => o.days === days);
  if (exact) {
    return {
      amount: Math.round(exact.price),
      basis: "exact",
      option: exact,
      isEstimate: false,
    };
  }

  const below = options.filter((o) => o.days < days);
  const above = options.filter((o) => o.days > days);
  const lower = below.length > 0 ? below[below.length - 1] : undefined;
  const upper = above.length > 0 ? above[0] : undefined;

  if (lower && upper) {
    const t =
      (Math.log(days) - Math.log(lower.days)) /
      (Math.log(upper.days) - Math.log(lower.days));
    return {
      amount: Math.round(lower.price + t * (upper.price - lower.price)),
      basis: "interpolated",
      isEstimate: true,
      note: `${lower.days}일·${upper.days}일 상품 사이 보간값. 실 견적 시 확정 필요`,
    };
  }

  if (upper && !lower) {
    // 최단 상품보다 짧은 기간 — 더 짧게 팔지 않으므로 최단 상품가를 그대로 받는다.
    return {
      amount: Math.round(upper.price),
      basis: "extrapolated",
      isEstimate: true,
      note: `최소 판매 단위는 ${upper.days}일입니다. ${upper.days}일 상품가 기준`,
    };
  }

  const max = options[options.length - 1];
  // R-4 — 총액이 최장 상품가 아래로 내려가면 안 된다. 등록된 최장 상품보다
  // 하루 더 산다고 총액이 8.5% 싸질 수는 없다. 장기 할인은 훨씬 나중부터만
  // 유효하고, 그 사이 구간은 최장 상품가 자체가 하한이다.
  const discounted = (max.price / max.days) * days * LONG_TERM_DISCOUNT;
  return {
    amount: Math.round(Math.max(max.price, discounted)),
    basis: "extrapolated",
    isEstimate: true,
    note: "장기 집행 추정값. 실 견적 시 협의 단가 적용",
  };
}

/**
 * 요청 기간보다 **짧게는 팔지 않는** 매체인지 — 최소 판매 단위(일)를 돌려준다.
 * 해당 없으면 null.
 *
 * `resolvePrice` 의 `upper && !lower` 갈래와 같은 조건이다. 그 갈래는 최단
 * 상품가를 그대로 청구액으로 잡지만(반달은 팔지 않으므로), 보고서 표시 금액은
 * 선형 환산이라 둘이 갈린다. 어느 쪽이 맞는지는 매체마다 협상으로 정해지므로
 * 시스템이 단정하지 않고, 이 함수로 "갈릴 수 있는 매체"만 식별해 안내한다.
 */
export function minSellableDaysAbove(
  priceOptions: readonly PriceOption[],
  days: number,
): number | null {
  const options = normalizePriceOptions(priceOptions);
  const shortest = options[0];
  if (!shortest || !Number.isFinite(days) || days <= 0) return null;
  return shortest.days > days ? shortest.days : null;
}

/**
 * 등록된 월(30일) 상품가와 일/주 단가 선형 환산값의 괴리 (R-03).
 * 0.1 이면 선형 환산이 실제 월 상품가보다 10% 높다는 뜻.
 * 반환 null = 비교 대상 부족.
 */
export function linearMonthlyDeviation(
  priceOptions: readonly PriceOption[],
): number | null {
  const options = normalizePriceOptions(priceOptions);
  const monthly = options.find((o) => o.days === 30);
  const shorter = options.find((o) => o.days > 0 && o.days < 30);
  if (!monthly || !shorter) return null;
  const derived = (shorter.price / shorter.days) * 30;
  return (derived - monthly.price) / monthly.price;
}
