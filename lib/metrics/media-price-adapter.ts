/**
 * `MediaItem` 가격 필드 → 계산 엔진 `PriceOption[]` 어댑터.
 *
 * D-05 의 핵심은 포맷이 아니라 **분자가 서로 다른 것**이다. 홈 카드의 가격
 * 라벨은 `price`/`pricePeriod`(주 기준)를, CPM 분자는
 * `catalogPrice`/`catalogPricePeriod`(일 기준)를 읽고 있었다. 같은 카드
 * 안에서 기간 기준이 갈리면 어떤 포매터를 써도 숫자는 맞지 않는다.
 *
 * 이 어댑터를 거치면 표시가·CPM 분자·견적 링크가 **하나의 등록 상품가**를
 * 공유한다. 일/주 단가 × N 선형 환산은 하지 않는다 (D-04).
 */
import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import { isAddonSurchargePriceOption } from "@/lib/media-price-addon-option";
import { periodToDays, resolvePrice } from "./price";
import type { PriceOption, PriceResult } from "./types";

/** 어댑터가 필요한 최소 필드 */
export type MediaPriceSource = Pick<
  MediaItem,
  "price" | "pricePeriod" | "priceOptions"
>;

/**
 * 등록된 가격 상품 목록.
 * - 가산·할증 옵션은 제외한다 (본상품가가 아니다)
 * - 기간을 해석할 수 없는 옵션은 버린다 (임의 추정 금지)
 */
export function mediaPriceOptions(media: MediaPriceSource): PriceOption[] {
  const out: PriceOption[] = [];

  const baseDays = periodToDays(media.pricePeriod);
  if (baseDays != null && typeof media.price === "number" && media.price > 0) {
    out.push({
      days: baseDays,
      price: media.price,
      id: "base",
      label: "기본가",
    });
  }

  const options: MediaPriceOption[] = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : [];

  options.forEach((opt, idx) => {
    if (!opt || typeof opt !== "object") return;
    if (isAddonSurchargePriceOption(opt)) return;
    const price = opt.price;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return;
    }
    const days = periodToDays(opt.period ?? media.pricePeriod);
    if (days == null) return;
    out.push({ days, price, id: `po-${idx}`, label: opt.label });
  });

  return out;
}

/**
 * 요청 기간에 대한 **실제 등록 상품가**.
 *
 * 카드·목록의 기본 비교 기준은 30일이다. 30일 상품이 등록돼 있으면 그
 * 금액을 그대로 쓰고(=`basis: "exact"`), 없으면 로그 보간·장기 할인
 * 외삽으로 추정하되 `isEstimate` 를 세워 UI 가 배지를 달게 한다.
 */
export function resolveMediaProductPrice(
  media: MediaPriceSource,
  days = 30,
): PriceResult | null {
  return resolvePrice(mediaPriceOptions(media), days);
}

export type ResolvedMediaPrice = {
  won: number;
  /** 이 금액이 성립하는 실제 상품 일수 */
  days: number;
  isEstimate: boolean;
  note?: string;
  /** 견적 링크에 실을 옵션 식별자 */
  optionId?: string;
};

/** UI·견적이 함께 쓰는 정규화된 가격 (표시·CPM 분자 공통) */
export function resolveMediaPriceForDisplay(
  media: MediaPriceSource,
  days = 30,
): ResolvedMediaPrice | null {
  const result = resolveMediaProductPrice(media, days);
  if (!result) return null;
  return {
    won: result.amount,
    days: result.option?.days ?? days,
    isEstimate: result.isEstimate,
    note: result.note,
    optionId: result.option?.id,
  };
}
