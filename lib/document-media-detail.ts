import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import {
  catalogPriceFieldToWon,
  formatCatalogPriceFieldWon,
  formatMediaPrice,
  formatPricePeriodShortLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import {
  formatPlannerQuantityLabel,
  plannerMediaPeriodLineWon,
  plannerMonthlyImpressionsForMedia,
  plannerMonthlyPriceWonForMedia,
  plannerUnitsForMedia,
  shouldShowPlannerQuantityControl,
  type CampaignMediaQuantities,
  type PlannerPeriodPricingContext,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import type { PlanCartItem } from "@/lib/plan-cart";
import { formatPlanCartMultiOptionQuantityLabel } from "@/lib/plan-cart-option-selections";
import {
  planCartLineMonthlyWon,
  planCartLinePeriodTotalWon,
} from "@/lib/plan-cart-pricing";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import { normalizeMediaTypeForPlanner } from "@/lib/planner-logic";
import { truncateDocText } from "@/lib/document-text";
import { formatSizeDisplayOptional } from "@/lib/format-media-size";

/** 보고서·견적서·PDF/PPT 공용 매체 상세 (필드 없으면 undefined → UI에서 숨김) */
export type DocumentMediaDetail = {
  id: string;
  name: string;
  location?: string;
  thumbUrl?: string | null;
  categoryLabel?: string;
  size?: string;
  operatingHours?: string;
  /** 일일 유동·노출 */
  dailyTraffic?: number;
  /** DOOH 송출 (예: 15초 / 시간당 240회) */
  broadcastLabel?: string;
  monthlyPriceLabel?: string;
  lineTotalLabel?: string;
  /** 수량 선택 매체 — 예: 2기, 40대 */
  quantityLabel?: string;
  /** 견적 집행 기간 (예: 1개월 · 4.3주) */
  executionPeriodLabel?: string;
  recommendReason?: string;
  exposureContributionPct?: number;
  budgetContributionPct?: number;
};

export type DocumentMediaDetailSource =
  | MediaItem
  | {
      id: string;
      name: string;
      location?: string | null;
      size?: string | null;
      operatingHours?: string | null;
      operatingHoursEn?: string | null;
      dailyFootfall?: number | null;
      dailyFootTraffic?: number | null;
      impressions?: number | null;
      sampleImages?: string[] | null;
      image?: string | null;
      price?: number | null;
      pricePeriod?: string | null;
      mediaMainCategory?: string | null;
      mediaSubCategory?: string | null;
      type?: string | null;
      recommendReason?: string | null;
      keywordFilter?: MediaItem["keywordFilter"];
      priceOptions?: MediaItem["priceOptions"];
      features?: string | null;
    };

function browseCategoryLabel(
  mainId: string | null | undefined,
  subId: string | null | undefined,
  isKo: boolean,
): string | undefined {
  if (!mainId && !subId) return undefined;
  const main = MEDIA_CATEGORIES.find((c) => c.id === mainId);
  const sub = main?.sub.find((s) => s.id === subId);
  const mainLabel = main ? (isKo ? main.label : main.labelEn ?? main.label) : mainId;
  const subLabel = sub ? (isKo ? sub.label : sub.labelEn ?? sub.label) : subId;
  if (mainLabel && subLabel) return `${mainLabel} · ${subLabel}`;
  return mainLabel ?? subLabel ?? undefined;
}

function resolveDailyTraffic(m: DocumentMediaDetailSource): number | undefined {
  const foot =
    ("dailyFootTraffic" in m ? m.dailyFootTraffic : null) ??
    ("dailyFootfall" in m ? m.dailyFootfall : null);
  if (foot != null && foot > 0) return foot;
  const imp = "impressions" in m ? m.impressions : null;
  if (imp != null && imp > 0) return Math.round(imp / 30);
  return undefined;
}

/** 송출/스펙 텍스트에서 raw 숫자 잔재 제거 + 큰 원금액을 만원 표기로 정리 */
function cleanSpecText(s: string): string {
  return s
    .replace(/\s*[·,]\s*\d{4,}\s*$/g, "") // 끝에 붙은 raw 숫자 (· 1200000)
    .replace(/\s*·\s*\d{4,}(?=\s*·)/g, "") // 중간 raw 숫자 토큰
    .replace(
      /(\d{7,})\s*원/g,
      (_m, n: string) =>
        `₩${Math.round(Number(n) / 10000).toLocaleString("ko-KR")}만`,
    ) // 7자리+ 원 → 만원
    .replace(/\s{2,}/g, " ")
    .replace(/\s*·\s*$/g, "")
    .trim();
}

export type DocumentBroadcastResolveOpts = {
  priceOptionIndex?: number;
  /** 제출 스냅샷 — catalog 변경 후에도 발행 당시 문구 */
  optionDescription?: string | null;
  optionLabel?: string | null;
  optionPriceWon?: number;
};

function buildDynamicBroadcastDescription(
  option: MediaPriceOption,
  overrides: Pick<DocumentBroadcastResolveOpts, "optionLabel" | "optionPriceWon">,
  isKo: boolean,
): string {
  const locale = isKo ? "ko" : "en";
  const label = overrides.optionLabel?.trim() || option.label.trim();
  const priceWon =
    overrides.optionPriceWon != null && overrides.optionPriceWon > 0
      ? overrides.optionPriceWon
      : catalogPriceFieldToWon(option.price);
  const priceStr = formatCatalogPriceFieldWon(priceWon, locale);
  const vatSuffix = isKo ? "(VAT 별도)" : "(excl. VAT)";
  const period =
    typeof option.period === "string" ? option.period.trim() : "";
  if (period && !label.includes(period)) {
    const spotLabel =
      /\d+초/.test(label) && !label.includes("영상")
        ? label.replace(/(\d+초)/, "$1 영상")
        : label;
    return `${spotLabel}, ${period}, ${priceStr} ${vatSuffix}`;
  }
  return `${label}, ${priceStr} ${vatSuffix}`;
}

function resolveBroadcastLabel(
  m: DocumentMediaDetailSource,
  opts: { isKo: boolean } & DocumentBroadcastResolveOpts,
): string | undefined {
  const { isKo } = opts;
  const priceOptions =
    "priceOptions" in m && m.priceOptions?.length ? m.priceOptions : undefined;

  if (priceOptions) {
    const idx = Math.min(
      Math.max(0, opts.priceOptionIndex ?? 0),
      priceOptions.length - 1,
    );
    const option = priceOptions[idx];
    if (option) {
      const snapDesc = opts.optionDescription?.trim();
      const catalogDesc = option.description?.trim();
      const text =
        snapDesc ||
        catalogDesc ||
        buildDynamicBroadcastDescription(option, opts, isKo);
      if (text) {
        return truncateDocText(cleanSpecText(text), 72);
      }
    }
  }

  const kf = "keywordFilter" in m ? m.keywordFilter : undefined;
  const durations = kf?.duration?.filter(Boolean) ?? [];
  const exposure = kf?.exposureTime?.filter(Boolean) ?? [];
  const rawParts: string[] = [];
  if (durations.length) rawParts.push(durations.join(" · "));
  if ("dailyExposure" in m && (m as MediaItem).dailyExposure?.trim()) {
    rawParts.push((m as MediaItem).dailyExposure!.trim());
  }
  const parts = rawParts
    .map(cleanSpecText)
    .filter((p) => p.length > 0 && !/^[\d,]+$/.test(p));
  if (!parts.length && exposure.length) {
    return isKo ? `노출: ${exposure.join(" · ")}` : `Exposure: ${exposure.join(" · ")}`;
  }
  if (!parts.length) return undefined;
  const isDooh =
    normalizeMediaTypeForPlanner(
      ("type" in m ? m.type : null) ?? undefined,
    ) === "digital";
  if (!isDooh && !durations.length) {
    return truncateDocText(parts.join(" · "), 72);
  }
  return truncateDocText(parts.join(" · "), 72);
}

function resolveThumb(m: DocumentMediaDetailSource): string | null {
  if ("sampleImages" in m && m.sampleImages?.[0]) return m.sampleImages[0]!;
  if ("image" in m && m.image) return m.image;
  if ("id" in m && "name" in m && "location" in m) {
    return getPrimaryMediaImageUrl(m as MediaItem) ?? resolveMediaGallery(m as MediaItem)[0] ?? null;
  }
  return null;
}

export function mediaToDocumentDetail(
  m: DocumentMediaDetailSource,
  opts: {
    isKo: boolean;
    lineTotalWon?: number;
    months?: number;
    exposureContributionPct?: number;
    budgetContributionPct?: number;
  } & DocumentBroadcastResolveOpts,
): DocumentMediaDetail {
  const isKo = opts.isKo;
  const name = m.name;
  const location =
    ("location" in m && m.location) ||
    ("locationEn" in m && !isKo && (m as MediaItem).locationEn) ||
    undefined;

  const categoryLabel = browseCategoryLabel(
    "mediaMainCategory" in m ? m.mediaMainCategory : undefined,
    "mediaSubCategory" in m ? m.mediaSubCategory : undefined,
    isKo,
  );

  const price = "price" in m && m.price != null ? m.price : undefined;
  const period =
    "pricePeriod" in m && m.pricePeriod
      ? normalizeMediaPricePeriod(m.pricePeriod)
      : "month";

  let monthlyPriceLabel: string | undefined;
  if (price != null && price > 0) {
    monthlyPriceLabel = `${formatCatalogPriceFieldWon(price, isKo ? "ko" : "en")}/${formatPricePeriodShortLabel(period, isKo ? "ko" : "en")}`;
  }

  let lineTotalLabel: string | undefined;
  if (opts.lineTotalWon != null && opts.lineTotalWon > 0) {
    lineTotalLabel = formatMediaPrice(opts.lineTotalWon, isKo ? "ko" : "en");
    if (opts.months && opts.months > 1) {
      lineTotalLabel += isKo ? ` (${opts.months}개월)` : ` (${opts.months} mo)`;
    }
  }

  const operatingHours = isKo
    ? ("operatingHours" in m && m.operatingHours) || undefined
    : ("operatingHoursEn" in m && (m as MediaItem).operatingHoursEn) ||
      ("operatingHours" in m && m.operatingHours) ||
      undefined;

  return {
    id: m.id,
    name,
    location: location?.trim() || undefined,
    thumbUrl: resolveThumb(m),
    categoryLabel,
    size: formatSizeDisplayOptional(m as MediaItem),
    operatingHours: operatingHours?.trim() || undefined,
    dailyTraffic: resolveDailyTraffic(m),
    broadcastLabel: resolveBroadcastLabel(m, opts),
    monthlyPriceLabel,
    lineTotalLabel,
    recommendReason:
      ("recommendReason" in m && m.recommendReason?.trim()) ||
      ("rationaleLines" in m && m.rationaleLines?.[0]?.trim()) ||
      undefined,
    exposureContributionPct: opts.exposureContributionPct,
    budgetContributionPct: opts.budgetContributionPct,
  };
}

/** 플래너 포트폴리오 — 노출·예산 기여도(%) */
export function computePortfolioContributions(
  items: MediaItem[],
  months: number,
  pricing?: PlannerPortfolioPricing,
  periodCtx?: PlannerPeriodPricingContext,
): Map<string, { exposurePct: number; budgetPct: number }> {
  const ctx =
    periodCtx ?? (months > 0 ? { months } : undefined);
  const effectiveMonths = months > 0 ? months : 1;
  const exposureWeights = items.map(
    (m) =>
      plannerMonthlyImpressionsForMedia(
        m,
        pricing?.quantities,
        pricing?.priceOptionIndex,
      ) * effectiveMonths,
  );
  const budgetWeights = items.map((m) =>
    ctx
      ? plannerMediaPeriodLineWon(m, ctx, pricing)
      : plannerMonthlyPriceWonForMedia(
          m,
          pricing?.quantities,
          pricing?.priceOptionIndex,
        ),
  );
  const expTotal = exposureWeights.reduce((a, b) => a + b, 0) || 1;
  const budTotal = budgetWeights.reduce((a, b) => a + b, 0) || 1;
  const map = new Map<string, { exposurePct: number; budgetPct: number }>();
  items.forEach((m, i) => {
    map.set(m.id, {
      exposurePct: Math.round((exposureWeights[i]! / expTotal) * 100),
      budgetPct: Math.round((budgetWeights[i]! / budTotal) * 100),
    });
  });
  return map;
}

export function mediaItemToExportRow(
  m: MediaItem,
  isKo: boolean,
  opts?: {
    lineTotalWon?: number;
    months?: number;
    periodCtx?: PlannerPeriodPricingContext;
    contributions?: Map<string, { exposurePct: number; budgetPct: number }>;
    pricing?: PlannerPortfolioPricing;
    quantities?: CampaignMediaQuantities;
    planCartItem?: PlanCartItem;
  },
): import("@/lib/planner-report-export/types").PlannerExportMediaRow {
  const c = opts?.contributions?.get(m.id);
  const pricing: PlannerPortfolioPricing =
    opts?.pricing ?? { quantities: opts?.quantities };
  const periodCtx =
    opts?.periodCtx ??
    (opts?.months != null && opts.months > 0 ? { months: opts.months } : undefined);
  const units = plannerUnitsForMedia(m, pricing.quantities);
  const monthlyWonFromCart =
    opts?.planCartItem != null
      ? planCartLineMonthlyWon(opts.planCartItem, m)
      : null;
  const monthlyWon =
    monthlyWonFromCart != null && monthlyWonFromCart > 0
      ? monthlyWonFromCart
      : plannerMonthlyPriceWonForMedia(
          m,
          pricing.quantities,
          pricing.priceOptionIndex,
        );
  const lineTotalWon =
    opts?.lineTotalWon ??
    (periodCtx
      ? opts?.planCartItem
        ? planCartLinePeriodTotalWon(opts.planCartItem, m, periodCtx, isKo)
        : plannerMediaPeriodLineWon(m, periodCtx, pricing, isKo)
      : monthlyWon > 0
        ? monthlyWon
        : undefined);
  const detail = mediaToDocumentDetail(m, {
    isKo,
    lineTotalWon,
    months: opts?.months,
    exposureContributionPct: c?.exposurePct,
    budgetContributionPct: c?.budgetPct,
  });
  const monthlyPriceLabel =
    monthlyWon > 0
      ? `${formatCatalogPriceFieldWon(monthlyWon, isKo ? "ko" : "en")}/${formatPricePeriodShortLabel(
          m.pricePeriod ?? "month",
          isKo ? "ko" : "en",
        )}`
      : detail.monthlyPriceLabel;
  const quantityLabel = (() => {
    if (opts?.planCartItem) {
      const multi = formatPlanCartMultiOptionQuantityLabel(
        m,
        opts.planCartItem,
        isKo,
      );
      if (multi) return multi;
    }
    if (!shouldShowPlannerQuantityControl(m)) return undefined;
    return formatPlannerQuantityLabel(
      m,
      units,
      isKo,
      pricing.priceOptionIndex,
    );
  })();
  return {
    ...detail,
    region: m.region ?? undefined,
    type: m.type ?? undefined,
    priceLabel: monthlyPriceLabel ?? detail.monthlyPriceLabel,
    monthlyPriceLabel,
    lineTotalLabel:
      lineTotalWon != null && lineTotalWon > 0
        ? formatMediaPrice(lineTotalWon, isKo ? "ko" : "en") +
          (opts?.months && opts.months > 1
            ? isKo
              ? ` (${opts.months}개월)`
              : ` (${opts.months} mo)`
            : "")
        : detail.lineTotalLabel,
    quantityLabel,
  };
}
