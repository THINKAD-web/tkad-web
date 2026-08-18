import { catalogToMediaItem } from "@/lib/media-catalog-map";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import {
  estimateCatalogCpmWon,
  priceToMonthlyEquivalentWon,
} from "@/lib/media-metrics";
import {
  formatMediaPriceWithPeriodSuffix,
  isNonMonthlyPricePeriod,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";
import { formatMediaPrice, resolveCpmDisplay } from "@/lib/metrics/format";

export type HomePopularCardPriceDisplay = {
  primary: string;
  /** non-month period only — original list price */
  secondary: string | null;
  monthlyEquivalentTooltip: string;
  originalPeriodTooltip: string | null;
};

export function buildHomePopularCardPriceDisplay(
  item: Pick<
    HomeCatalogMediaItem,
    | "price"
    | "pricePeriod"
    | "productPriceWon"
    | "productPriceDays"
    | "productPriceIsEstimate"
    | "country"
  >,
  locale: string,
  isKo: boolean,
): HomePopularCardPriceDisplay | null {
  // ⑦ 실제 등록 상품가가 있으면 그것이 기준이다. 일/주 단가 × N 로
  //    월가를 만들어내면 M-CITY 처럼 실제 7,000만 상품이 1억으로 부풀어
  //    43% 과다 견적이 된다 (D-04).
  if (item.productPriceWon && item.productPriceWon > 0) {
    const days = item.productPriceDays ?? 30;
    const isEstimate = item.productPriceIsEstimate === true;
    const primary = formatMediaPrice(item.productPriceWon, days, locale, {
      isEstimate,
    });
    return {
      primary,
      secondary: null,
      monthlyEquivalentTooltip: isEstimate
        ? isKo
          ? `등록 상품가 사이 보간 추정값입니다 (${days}일 기준). 실 견적 시 확정됩니다.`
          : `Interpolated between listed products (${days}-day basis). Confirmed at quotation.`
        : isKo
          ? `운영 등록 ${days}일 상품가입니다.`
          : `Listed ${days}-day product rate.`,
      originalPeriodTooltip: null,
    };
  }

  if (!item.price || item.price <= 0) {
    return {
      primary: mediaPriceOnInquiryLabel(locale),
      secondary: null,
      monthlyEquivalentTooltip: isKo
        ? "단가는 문의 후 안내됩니다."
        : "Rate is provided on request.",
      originalPeriodTooltip: null,
    };
  }

  const original = formatMediaPriceWithPeriodSuffix(
    item.price,
    item.pricePeriod,
    locale,
    item.country,
  );
  const monthlyWon = priceToMonthlyEquivalentWon(item.price, item.pricePeriod);
  const monthlyLabel = formatMediaPriceWithPeriodSuffix(
    monthlyWon,
    "month",
    locale,
    item.country,
  );

  if (!isNonMonthlyPricePeriod(item.pricePeriod)) {
    return {
      primary: original,
      secondary: null,
      monthlyEquivalentTooltip: isKo
        ? "표시 단가는 1개월 기준 광고비입니다."
        : "Listed rate is for a one-month flight.",
      originalPeriodTooltip: null,
    };
  }

  return {
    primary: monthlyLabel,
    secondary: isKo ? `(기준 ${original})` : `(list: ${original})`,
    monthlyEquivalentTooltip: isKo
      ? "카드 간 비교를 위해 월 환산 단가입니다. 일×30, 2주×2, 주×4로 계산합니다."
      : "Monthly equivalent for cross-card comparison (day×30, 2-week×2, week×4).",
    originalPeriodTooltip: isKo
      ? `운영 등록 단가: ${original}`
      : `Listed rate: ${original}`,
  };
}

/**
 * 홈 인기 카드 CPM — 분자는 **표시가와 동일한** 등록 상품가.
 *
 * 이전에는 라벨이 `price`/`pricePeriod`(주 기준)를, CPM 이
 * `catalogPrice`/`catalogPricePeriod`(일 기준)를 읽어 한 카드 안에서
 * 기간 기준이 갈렸다. 그 결과 M-CITY 가 라벨 ₩1억/월 · CPM ₩954,545 로
 * 표시됐다 (일 단가 × 30). 이제 둘 다 `productPriceWon` 을 쓴다.
 */
export function homePopularCardCpmWon(
  item: HomeCatalogMediaItem,
): number | null {
  const productWon = item.productPriceWon;
  const monthlyWon =
    typeof productWon === "number" && productWon > 0
      ? productWon
      : // 폴백: 등록 상품가를 못 구한 매체만 기존 월환산 경로를 쓴다
        priceToMonthlyEquivalentWon(
          typeof item.catalogPrice === "number" && item.catalogPrice > 0
            ? item.catalogPrice
            : (item.price ?? 0),
          item.catalogPricePeriod ?? item.pricePeriod,
        );
  if (monthlyWon <= 0) return null;
  const base = catalogToMediaItem(item);
  return estimateCatalogCpmWon({ ...base, price: monthlyWon, cpm: undefined });
}

/** 광고주 대면 — 극단값은 "CPM 산정 중" 으로 대체된다 (⑧) */
export function formatHomePopularCardCpm(
  item: HomeCatalogMediaItem,
  locale: string,
): string | null {
  const cpm = homePopularCardCpmWon(item);
  const display = resolveCpmDisplay(cpm, locale);
  if (display.rawWon == null) return null;
  return display.text;
}

export function homePopularCardCpmTooltip(isKo: boolean): string {
  return isKo
    ? "CPM(천회당 비용) = 월 환산 광고비 ÷ (월 추정 노출 ÷ 1,000). 매체별 노출은 DB·유동 데이터 기준 추정치입니다."
    : "CPM (cost per 1,000 impressions) = monthly ad cost ÷ (estimated monthly impressions ÷ 1,000). Reach is estimated from catalog data.";
}

export function homePopularCardDoohTooltip(isKo: boolean): string {
  return isKo
    ? "DOOH(Digital Out-of-Home): 디지털 옥외광고 — LED·LCD 전광판 등 시간대별 송출 매체."
    : "DOOH (Digital Out-of-Home): digital screens such as LED billboards with scheduled playback.";
}
