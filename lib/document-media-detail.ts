import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import { isQuoteOnlyMedia, mediaQuoteOnlyLabel } from "@/lib/media-pricing-mode";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import {
  catalogPriceFieldToWon,
  formatCatalogPriceFieldWon,
  formatPricePeriodShortLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { formatKrwPrimaryWithJpyFootnote } from "@/lib/media-display-currency";
import {
  formatPlannerQuantityLabel,
  plannerMediaPeriodLineWon,
  plannerMonthlyPriceWonForMedia,
  plannerUnitsForMedia,
  resolvePlanPeriodInput,
  shouldShowPlannerQuantityControl,
  type CampaignMediaQuantities,
  type PlannerPeriodPricingContext,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import { calculatePlan } from "@/lib/planner/calc/engine";
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
  /**
   * 일 유동인구 — 매체 앞을 지나간 사람 수(raw). 수량 반영 후 값이다.
   * "일일 노출" 로 라벨링하지 말 것 — 실제 노출과는 유형별로 최대 20배
   * 차이난다 (증상3 스코핑 문서 참고).
   */
  dailyTraffic?: number;
  /**
   * 일 실노출(추정) — 접촉률·SOV 보정을 반영한, 실제로 광고를 보는 사람 수.
   * `PlanMediaItem.dailyImpressions` 에서 그대로 가져온다(재계산 없음).
   * 보고서의 기여도·CPM·정렬은 전부 이 기준이다 — 표시 병기에만 쓰고
   * 계산에 다시 넣지 말 것.
   *
   * 엔진 결과(`plan.mediaItems`)에 접근할 수 있는 호출자(브리프·플랜카트
   * 보고서)만 채운다. 견적서 등 엔진을 거치지 않는 경로는 undefined —
   * 그 경로는 raw 만 있던 기존 동작 그대로다.
   */
  adjustedDailyReach?: number;
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
  budgetContributionPct?: number | null;
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
      country?: string | null;
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

function resolveMediaCountry(
  m: DocumentMediaDetailSource,
): string | null | undefined {
  return "country" in m ? m.country : undefined;
}

function formatReportMonthlyPriceLabel(
  won: number,
  period: string,
  country: string | null | undefined,
  isKo: boolean,
): string {
  const locale = isKo ? "ko-KR" : "en-US";
  return `${formatKrwPrimaryWithJpyFootnote(won, country, locale)}/${formatPricePeriodShortLabel(
    period,
    isKo ? "ko" : "en",
  )}`;
}

function formatReportLineTotalLabel(
  lineTotalWon: number,
  country: string | null | undefined,
  isKo: boolean,
  months?: number,
): string {
  const locale = isKo ? "ko-KR" : "en-US";
  let label = formatKrwPrimaryWithJpyFootnote(lineTotalWon, country, locale);
  if (months && months > 1) {
    label += isKo ? ` (${months}개월)` : ` (${months} mo)`;
  }
  return label;
}

export function mediaToDocumentDetail(
  m: DocumentMediaDetailSource,
  opts: {
    isKo: boolean;
    lineTotalWon?: number;
    months?: number;
    exposureContributionPct?: number;
    budgetContributionPct?: number | null;
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
  const country = resolveMediaCountry(m);

  let monthlyPriceLabel: string | undefined;
  if (price != null && price > 0) {
    monthlyPriceLabel = formatReportMonthlyPriceLabel(
      price,
      period,
      country,
      isKo,
    );
  }

  let lineTotalLabel: string | undefined;
  if (opts.lineTotalWon != null && opts.lineTotalWon > 0) {
    lineTotalLabel = formatReportLineTotalLabel(
      opts.lineTotalWon,
      country,
      isKo,
      opts.months,
    );
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

/**
 * 플래너 포트폴리오 — 노출·예산 기여도(%).
 *
 * A-1 Wave 3 — `calculatePlan` 을 소비한다.
 *
 * 기존에는 노출 기여도를 `plannerMonthlyImpressionsForMedia × months` 로
 * 따로 계산했다. 매체 카드가 표시하는 일 유동인구와 계산 기준이 달라
 * 카드 순서와 기여도 순서가 뒤집힐 수 있었다 (D3 매체 순서 역전).
 * 이제 노출·예산 비중이 `PlanResult` 한 곳에서 나오므로 어긋날 수 없다.
 *
 * 금액은 여전히 호출자 정책이다 — `itemNet` 에 매체 표 line total 과
 * 같은 함수를 넣어 지역 표·기여도·매체 표가 모두 같은 금액을 본다.
 */
export function computePortfolioContributions(
  items: MediaItem[],
  months: number,
  pricing?: PlannerPortfolioPricing,
  periodCtx?: PlannerPeriodPricingContext,
): Map<string, { exposurePct: number; budgetPct: number }> {
  const map = new Map<string, { exposurePct: number; budgetPct: number }>();
  if (items.length === 0) return map;

  const ctx = periodCtx ?? (months > 0 ? { months } : undefined);
  const effectiveMonths = months > 0 ? months : 1;

  const plan = calculatePlan({
    media: items.map((m) => ({
      media: m,
      units: pricing?.quantities?.[m.id],
      itemNet: ctx
        ? plannerMediaPeriodLineWon(m, ctx, pricing)
        : plannerMonthlyPriceWonForMedia(
            m,
            pricing?.quantities,
            pricing?.priceOptionIndex,
          ),
      itemImpressions: pricing?.impressions?.[m.id],
    })),
    period: resolvePlanPeriodInput(effectiveMonths, pricing),
    budgetWon: 0,
  });

  // `impressionShare` 는 이미 소수 1자리로 반올림돼 있다. 그걸 다시 정수로
  // 반올림하면 이중 반올림이 되어 21.49% 가 22% 로 올라간다.
  // 분자·분모 모두 PlanResult 값이므로 재계산이 아니라 표시 반올림만 한 번 한다.
  const impTotal = plan.impressions.campaignTotal || 1;
  const netTotal =
    plan.mediaItems
      .filter((row) => {
        const media = items.find((m) => m.id === row.id);
        return media != null && !isQuoteOnlyMedia(media);
      })
      .reduce((s, r) => s + r.itemNet, 0) || 1;
  for (const row of plan.mediaItems) {
    const media = items.find((m) => m.id === row.id);
    const budgetPct =
      media != null && isQuoteOnlyMedia(media)
        ? null
        : Math.round((row.itemNet / netTotal) * 100);
    map.set(row.id, {
      exposurePct: Math.round((row.campaignImpressions / impTotal) * 100),
      budgetPct,
    });
  }
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
    /**
     * `PlanMediaItem.dailyImpressions` (엔진 이미 계산한 값) — id 로 조회.
     * 증상3 병기용. 없으면 `adjustedDailyReach` 는 undefined.
     */
    adjustedDailyReachById?: Readonly<Record<string, number>>;
  },
): import("@/lib/planner-report-export/types").PlannerExportMediaRow {
  const c = opts?.contributions?.get(m.id);
  const pricing: PlannerPortfolioPricing =
    opts?.pricing ?? { quantities: opts?.quantities };
  const periodCtx =
    opts?.periodCtx ??
    (opts?.months != null && opts.months > 0 ? { months: opts.months } : undefined);
  const units = plannerUnitsForMedia(m, pricing.quantities);
  /**
   * 카드에 표시할 수량 — 저장 라인 수량을 그대로 존중한다.
   *
   * `resolveMediaQuantity` 는 「수량 선택형」이 아닌 매체(고정형 등)에 대해
   * 무조건 1을 돌려준다. 단가 해소 관점에서는 옳지만, 저장 스냅샷의 라인
   * 수량은 그와 무관하게 2 이상일 수 있다 — 고정형 「총 2면」이 그 경우다
   * (`brief/store.ts` 의 `setMixUnits` 는 유형을 가리지 않는다).
   *
   * 저장 시점 계산(`calcMixMetrics.calcLineMetrics`)은 유형과 무관하게 수량에
   * 비례해 노출·금액을 올려 두므로, 카드에서만 수량을 1로 뭉개면 카드가
   * 자기 라인 금액과도 어긋난다. 그래서 표시 수량은 저장값을 따른다.
   */
  const storedUnits = pricing.quantities?.[m.id];
  const displayUnits =
    storedUnits != null && Number.isFinite(storedUnits) && storedUnits > 1
      ? Math.round(storedUnits)
      : units;
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
    budgetContributionPct:
      c?.budgetPct === null ? null : c?.budgetPct,
  });
  const quoteOnly = isQuoteOnlyMedia(m);
  const monthlyPriceLabel =
    quoteOnly
      ? mediaQuoteOnlyLabel(isKo)
      : monthlyWon > 0
        ? formatReportMonthlyPriceLabel(
            monthlyWon,
            m.pricePeriod ?? "month",
            m.country,
            isKo,
          )
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
    // 수량 조절 UI 가 없는 매체라도, 저장 수량이 2 이상이면 카드에 드러낸다.
    if (!shouldShowPlannerQuantityControl(m) && displayUnits <= 1) {
      return undefined;
    }
    return formatPlannerQuantityLabel(
      m,
      displayUnits,
      isKo,
      pricing.priceOptionIndex,
    );
  })();
  /**
   * `dailyFootTraffic` 은 **1단위당** 값이다 — 네트워크는 지점당(A-1b Wave 4),
   * 고정형 「총 2면」은 면당. 카드는 "일일 노출" 이라는 이름으로 전체량인 것처럼
   * 보여주므로 저장 수량을 곱해 합산값으로 맞춘다.
   *
   * Wave 4 는 네트워크만 처리했다. 저장 시점 계산은 유형을 가리지 않고 수량에
   * 비례하므로(`calcLineMetrics`), 표시도 유형이 아니라 **수량 자체**를 기준으로
   * 삼는다. 네트워크의 기존 동작은 그대로다 (수량이 곧 지점 수).
   */
  const dailyTraffic =
    detail.dailyTraffic != null && displayUnits > 1
      ? detail.dailyTraffic * displayUnits
      : detail.dailyTraffic;
  return {
    ...detail,
    region: m.region ?? undefined,
    type: m.type ?? undefined,
    priceLabel: monthlyPriceLabel ?? detail.monthlyPriceLabel,
    monthlyPriceLabel,
    budgetContributionPct: quoteOnly
      ? null
      : detail.budgetContributionPct,
    lineTotalLabel:
      quoteOnly
        ? mediaQuoteOnlyLabel(isKo)
        : lineTotalWon != null && lineTotalWon > 0
          ? formatReportLineTotalLabel(
              lineTotalWon,
              m.country,
              isKo,
              opts?.months,
            )
          : detail.lineTotalLabel,
    quantityLabel,
    dailyTraffic,
    adjustedDailyReach: opts?.adjustedDailyReachById?.[m.id],
  };
}
