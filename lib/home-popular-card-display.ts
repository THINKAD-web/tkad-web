import { catalogToMediaItem } from "@/lib/media-catalog-map";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import {
  estimateCatalogCpmWon,
  priceToMonthlyEquivalentWon,
} from "@/lib/media-metrics";
import {
  formatCpmKrw,
  formatMediaPriceWithPeriodSuffix,
  isNonMonthlyPricePeriod,
} from "@/lib/media-price-format";

export type HomePopularCardPriceDisplay = {
  primary: string;
  /** non-month period only — original list price */
  secondary: string | null;
  monthlyEquivalentTooltip: string;
  originalPeriodTooltip: string | null;
};

export function buildHomePopularCardPriceDisplay(
  item: Pick<HomeCatalogMediaItem, "price" | "pricePeriod">,
  locale: string,
  isKo: boolean,
): HomePopularCardPriceDisplay | null {
  if (!item.price || item.price <= 0) return null;

  const original = formatMediaPriceWithPeriodSuffix(
    item.price,
    item.pricePeriod,
    locale,
  );
  const monthlyWon = priceToMonthlyEquivalentWon(item.price, item.pricePeriod);
  const monthlyLabel = formatMediaPriceWithPeriodSuffix(
    monthlyWon,
    "month",
    locale,
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

/** 홈 인기 카드 — pricePeriod 반영 CPM (월 환산 단가 ÷ 월 노출) */
export function homePopularCardCpmWon(
  item: HomeCatalogMediaItem,
): number | null {
  const monthlyWon = priceToMonthlyEquivalentWon(item.price ?? 0, item.pricePeriod);
  if (monthlyWon <= 0) return null;
  const base = catalogToMediaItem(item);
  return estimateCatalogCpmWon({ ...base, price: monthlyWon, cpm: undefined });
}

export function formatHomePopularCardCpm(
  item: HomeCatalogMediaItem,
  locale: string,
): string | null {
  const cpm = homePopularCardCpmWon(item);
  if (cpm == null) return null;
  return formatCpmKrw(cpm, locale);
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
