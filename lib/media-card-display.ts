import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import {
  buildCatalogItemMetricLine,
  buildCatalogItemMetricLineCompact,
} from "@/lib/media-card-metrics";
import {
  hasOnlinePricingSpec,
  isOnlineCatalogMedia,
  isPricingUnavailable,
} from "@/lib/pricing-unavailable";
import { onlinePricingLabel } from "@/lib/pricing/online-performance-estimate";
import {
  formatCatalogPriceFieldWon,
  formatMediaPriceWithPeriodSuffix,
  formatPricePeriodShortLabel,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";

/** 온라인 플래너 3-6 — 플래너 세션에서 온 카드에 얹는 추천 컨텍스트(채널·플랫폼 단위) */
export type PlannerOnlineCardContextEntry = {
  /** 이 채널(플랫폼)에 배분된 예산 비중(%) — 추천 플랫폼일 때만 */
  recommendedBudgetPct?: number;
  estimatedMetricMin?: number;
  estimatedMetricMax?: number;
  metricType?: "impressions" | "clicks";
  /** 예산 부족으로 플랜에서 제외된 채널일 때만(사유 문구, 이미 로케일 반영됨) */
  excludedForBudgetReason?: string;
};

export type MediaCardDisplayModel = PlannerOnlineCardContextEntry & {
  id: string;
  name: string;
  type?: string;
  trustScore?: number;
  isVerified?: boolean;
  thumbnailUrl?: string;
  galleryExtraCount: number;
  priceLabel: string;
  showPeriodSuffix: boolean;
  periodLabel?: string | null;
  metricLine?: string | null;
  /** 2열 그리드 등 좁은 셀 — CPM 축약 1줄 */
  metricLineCompact?: string | null;
  /** 온라인 매체 — `onlineSpec.minBudget` 있을 때만 (`"최소 예산 ₩80만"`) */
  minBudgetLabel?: string | null;
  highlights: string[];
  detailHref: string;
};

/**
 * 온라인 플래너 3-6 — "추천 비중 32% · 예상 노출 15만~25만" 한 줄.
 * `BriefDigitalPanel`의 `PlatformCard`가 쓰는 조건부 표시 패턴과 동일 —
 * 값이 없으면(일반 브라우징 카드) null 반환.
 */
export function formatPlannerRecommendLine(
  model: Pick<
    PlannerOnlineCardContextEntry,
    "recommendedBudgetPct" | "estimatedMetricMin" | "estimatedMetricMax" | "metricType"
  >,
  isKo: boolean,
): string | null {
  if (model.recommendedBudgetPct == null) return null;
  const shareLabel = isKo ? "추천 비중" : "Recommended share";
  let line = `${shareLabel} ${model.recommendedBudgetPct}%`;
  const min = model.estimatedMetricMin;
  const max = model.estimatedMetricMax;
  // 단가 정보 없는 채널은 min/max가 둘 다 0 — `OnlineChannelCard`의
  // formatMetricRange()와 동일하게 "0~0" 대신 라인 자체를 생략한다.
  if (min != null && max != null && (min > 0 || max > 0)) {
    const metricLabel =
      model.metricType === "clicks"
        ? isKo
          ? "예상 클릭"
          : "Est. clicks"
        : isKo
          ? "예상 노출"
          : "Est. impr.";
    const locale = isKo ? "ko-KR" : "en-US";
    const range = `${min.toLocaleString(locale)}~${max.toLocaleString(locale)}`;
    line += ` · ${metricLabel} ${range}`;
  }
  return line;
}

function buildMinBudgetLabel(
  item: Pick<HomeCatalogMediaItem, "catalogChannel" | "onlineSpec">,
  isKo: boolean,
  locale: string,
): string | null {
  if (!isOnlineCatalogMedia({ catalogChannel: item.catalogChannel })) return null;
  const minBudget = item.onlineSpec?.minBudget;
  if (!minBudget || minBudget <= 0) return null;
  const amount = formatCatalogPriceFieldWon(minBudget, locale);
  return isKo ? `최소 예산 ${amount}` : `Min. budget ${amount}`;
}

function galleryExtraCount(item: {
  thumbnailUrl?: string;
  galleryImages?: string[];
}): number {
  const seen = new Set<string>();
  let count = 0;
  for (const u of [item.thumbnailUrl, ...(item.galleryImages ?? [])]) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    count += 1;
  }
  return Math.max(0, count - 1);
}

/** Parent `priceLabel` already embeds `/일`·`/월` (or en equivalents). */
export function priceLabelIncludesPeriodSuffix(
  priceLabel: string,
  periodLabel: string,
): boolean {
  const price = priceLabel.trim();
  const period = periodLabel.trim();
  if (!price || !period) return false;
  return price.includes(`/${period}`);
}

type BrowseCardPriceItem = Pick<
  HomeCatalogMediaItem,
  | "price"
  | "pricePeriod"
  | "catalogChannel"
  | "onlineSpec"
  | "type"
  | "catalogSource"
  | "networkMinUnits"
  | "priceOptions"
  | "country"
>;

/**
 * Browse list/card price — SSOT via `isPricingUnavailable` (online + offline inquiry).
 * Pre-existing gap: browse used `price` falsy only; offline negotiated rows could show ₩0.
 */
export function formatBrowseCardPriceLabel(
  item: BrowseCardPriceItem,
  locale = "ko-KR",
): string | null {
  const isKo = locale.startsWith("ko");
  if (isOnlineCatalogMedia({ catalogChannel: item.catalogChannel })) {
    if (
      item.onlineSpec &&
      hasOnlinePricingSpec({ catalogChannel: item.catalogChannel, onlineSpec: item.onlineSpec })
    ) {
      return onlinePricingLabel(item.onlineSpec);
    }
    return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
  }
  if (!item.type?.trim() || item.price == null || item.price <= 0) {
    return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
  }
  if (
    item.catalogSource != null &&
    isPricingUnavailable({
      catalogChannel: item.catalogChannel,
      type: item.type,
      price: item.price,
      catalogSource: item.catalogSource,
      networkMinUnits: item.networkMinUnits,
      priceOptions: item.priceOptions,
    })
  ) {
    return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
  }
  return formatCatalogPriceFieldWon(item.price, locale, item.country);
}

export function catalogItemToDisplayModel(
  item: HomeCatalogMediaItem,
  opts: {
    href: string;
    isKo: boolean;
    priceLabel?: string | null;
    highlights?: string[];
  } & PlannerOnlineCardContextEntry,
): MediaCardDisplayModel {
  const locale = opts.isKo ? "ko-KR" : "en-US";
  const parentLabel = opts.priceLabel?.trim() || null;
  const ssotLabel = parentLabel ?? formatBrowseCardPriceLabel(item, locale);
  const formattedNumericPrice =
    ssotLabel ??
    (item.price && item.price > 0
      ? formatCatalogPriceFieldWon(item.price, locale, item.country)
      : null);
  const displayPrice = formattedNumericPrice;
  const periodLabel = formatPricePeriodShortLabel(
    item.pricePeriod,
    opts.isKo ? "ko" : "en",
  );

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    trustScore: item.trustScore,
    isVerified: item.isVerified,
    thumbnailUrl: item.thumbnailUrl,
    galleryExtraCount: galleryExtraCount(item),
    priceLabel:
      displayPrice ?? mediaPriceOnInquiryLabel(opts.isKo ? "ko" : "en"),
    showPeriodSuffix: Boolean(
      displayPrice &&
        periodLabel &&
        !priceLabelIncludesPeriodSuffix(displayPrice, periodLabel),
    ),
    periodLabel,
    metricLine: buildCatalogItemMetricLine(item, opts.isKo, locale),
    metricLineCompact: buildCatalogItemMetricLineCompact(item, locale),
    minBudgetLabel: buildMinBudgetLabel(item, opts.isKo, locale),
    highlights: opts.highlights ?? [],
    detailHref: opts.href,
    recommendedBudgetPct: opts.recommendedBudgetPct,
    estimatedMetricMin: opts.estimatedMetricMin,
    estimatedMetricMax: opts.estimatedMetricMax,
    metricType: opts.metricType,
    excludedForBudgetReason: opts.excludedForBudgetReason,
  };
}

export function mapItemToDisplayModel(
  item: MapMapItem,
  locale: string,
  isKo: boolean,
): MediaCardDisplayModel {
  const priceLabel = formatMediaPriceWithPeriodSuffix(
    item.price,
    item.pricePeriod,
    locale,
    item.country,
  );

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    trustScore: undefined,
    isVerified: item.isVerified,
    thumbnailUrl: item.image ?? undefined,
    galleryExtraCount: 0,
    priceLabel,
    showPeriodSuffix: false,
    periodLabel: null,
    metricLine: buildCatalogItemMetricLine(item, isKo, locale),
    metricLineCompact: buildCatalogItemMetricLineCompact(item, locale),
    highlights: [],
    detailHref: `/media/${item.id}`,
  };
}
