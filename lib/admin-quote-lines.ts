import type { AdminMediaDto } from "@/lib/admin-media-dto";
import type { AdminQuoteBillingContext } from "@/lib/admin-quote-billing";
import {
  decodeAdminQuoteItemSpec,
  encodeAdminQuoteItemSpec,
} from "@/lib/admin-quote-line-spec";
import type { QuoteItemApi } from "@/lib/admin-sales-quote";
import { quotePeriodLookupKeyFromDays } from "@/lib/compare-quote";
import {
  quoteLineTotalWonFromPartialRate,
  resolvePartialPeriodRate,
} from "@/lib/media-partial-period-rates";
import { catalogPriceFieldToWon } from "@/lib/pricing";
import { normalizeMediaPricePeriod } from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import { formatPlannerQuantityLabel } from "@/lib/planner/planner-media-quantity";

export type AdminQuotePeriodKey = "month" | "biweekly" | "week" | "day";

export type AdminQuoteCatalogLine = {
  kind: "catalog";
  lineId: string;
  mediaId: string;
  priceOptionIndex: number;
  quantity: number;
  /** 소계 수동 덮어쓰기(원). null/undefined = 자동 계산 */
  amountOverrideWon?: number | null;
};

export type AdminQuoteCustomLine = {
  kind: "custom";
  lineId: string;
  name: string;
  quantity: number;
  unitPriceWon: number;
};

export type AdminQuoteLine = AdminQuoteCatalogLine | AdminQuoteCustomLine;

export type AdminCatalogLineBillingResult = {
  autoAmount: number;
  amount: number;
  usesMediaPartialRate: boolean;
  usesProRataFallback: boolean;
  amountOverridden: boolean;
};

export type AdminQuoteBuiltLineItem = {
  lineId: string;
  mediaId: string;
  mediaName: string;
  spec: string;
  period: string;
  unitPrice: number;
  unitPeriod: AdminQuotePeriodKey;
  quantity: number;
  quantityLabel?: string;
  amount: number;
  autoAmount?: number;
  /** 매체·옵션 부분기간 요율 적용 */
  usesMediaPartialRate?: boolean;
  /** 부분기간 요율 미등록 → 일할 폴백 */
  usesProRataFallback?: boolean;
  amountOverridden?: boolean;
  /**
   * 카탈로그 표시단가 ≤0 이고 소계 override 없음 → 「별도 문의」.
   * override가 있으면 false이며 unitPrice/amount에 협의가가 반영됨.
   */
  priceOnInquiry?: boolean;
};

export function newAdminQuoteLineId(prefix = "l"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCatalogQuoteLine(
  mediaId: string,
  opts?: {
    priceOptionIndex?: number;
    quantity?: number;
    amountOverrideWon?: number | null;
  },
): AdminQuoteCatalogLine {
  return {
    kind: "catalog",
    lineId: newAdminQuoteLineId(),
    mediaId,
    priceOptionIndex: opts?.priceOptionIndex ?? 0,
    quantity: Math.max(1, opts?.quantity ?? 1),
    amountOverrideWon: opts?.amountOverrideWon ?? null,
  };
}

export function createCustomQuoteLine(
  partial?: Partial<Pick<AdminQuoteCustomLine, "name" | "quantity" | "unitPriceWon">>,
): AdminQuoteCustomLine {
  return {
    kind: "custom",
    lineId: newAdminQuoteLineId("c"),
    name: partial?.name ?? "",
    quantity: Math.max(1, partial?.quantity ?? 1),
    unitPriceWon: Math.max(0, partial?.unitPriceWon ?? 0),
  };
}

export function adminMediaDtoToMediaItem(m: AdminMediaDto): MediaItem {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn ?? m.name,
    location: m.location,
    locationEn: m.location,
    region: m.region,
    type: m.type,
    price: m.price,
    lat: m.latitude ?? 0,
    lng: m.longitude ?? 0,
    dailyFootTraffic: m.dailyFootfall ?? 0,
    sampleImages: m.image ? [m.image] : [],
    priceOptions: m.priceOptions ?? undefined,
    partialPeriodRates: m.partialPeriodRates ?? undefined,
  };
}

/** 라인별 수량 컨트롤 — mediaId 충돌 방지용 synthetic MediaItem */
export function adminLineMediaItemForControl(
  m: AdminMediaDto,
  lineId: string,
): MediaItem {
  return { ...adminMediaDtoToMediaItem(m), id: lineId };
}

export function mediaSpecLine(m: AdminMediaDto): string {
  const wh =
    m.width && m.height ? `${m.width}×${m.height}` : m.width || m.height || "";
  const bits = [m.resolution, wh].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : "—";
}

export function catalogLinePrice(
  m: AdminMediaDto,
  priceOptionIndex: number,
): {
  rawPrice: number;
  period: AdminQuotePeriodKey;
  label: string | null;
} {
  const idx = Math.max(0, priceOptionIndex);
  const opt = m.priceOptions?.[idx];
  const rawPrice = opt?.price ?? m.price;
  const period = normalizeMediaPricePeriod(opt?.period) as AdminQuotePeriodKey;
  return { rawPrice, period, label: opt?.label ?? null };
}

export function adminFactorForPeriod(
  p: AdminQuotePeriodKey,
  d: number,
): number {
  const dd = Math.max(0, d);
  switch (p) {
    case "biweekly":
      return dd / 14;
    case "week":
      return dd / 7;
    case "day":
      return dd;
    default:
      return dd / 30;
  }
}

export function computeAdminCatalogLineAmount(
  rawPrice: number,
  period: AdminQuotePeriodKey,
  days: number,
  quantity: number,
  factorForPeriod: (p: AdminQuotePeriodKey, d: number) => number,
): number {
  const unitWon = catalogPriceFieldToWon(rawPrice);
  const factor = factorForPeriod(period, days);
  return Math.round(unitWon * factor * Math.max(0, quantity));
}

/**
 * @deprecated Prefer `resolveAdminCatalogLineBilling` with billing context.
 * Kept for callers that only pass days + factorForPeriod (legacy tests / OOH bridge).
 */
export function computeAdminCatalogLineAmountForMedia(
  m: AdminMediaDto,
  priceOptionIndex: number,
  days: number,
  quantity: number,
  factorForPeriod: (p: AdminQuotePeriodKey, d: number) => number,
): { amount: number; usesMediaPartialRate: boolean } {
  const billing: AdminQuoteBillingContext = {
    mode: "custom_dates",
    calendarMonths: 1,
    presetDays: days,
    days,
    startDate: "1970-01-01",
    endDate: "1970-01-01",
  };
  const r = resolveAdminCatalogLineBilling({
    media: m,
    priceOptionIndex,
    quantity,
    billing,
    amountOverrideWon: null,
    factorForPeriod,
  });
  return {
    amount: r.amount,
    usesMediaPartialRate: r.usesMediaPartialRate,
  };
}

/**
 * Admin 카탈로그 라인 청구.
 * - calendar_months + 월단가: 단가 × N × qty
 * - day_preset / custom: partial rate 우선, 없으면 일할 폴백
 */
export function resolveAdminCatalogLineBilling(opts: {
  media: AdminMediaDto;
  priceOptionIndex: number;
  quantity: number;
  billing: AdminQuoteBillingContext;
  amountOverrideWon?: number | null;
  factorForPeriod?: (p: AdminQuotePeriodKey, d: number) => number;
}): AdminCatalogLineBillingResult {
  const qty = Math.max(0, opts.quantity);
  const factor = opts.factorForPeriod ?? adminFactorForPeriod;
  const { rawPrice, period } = catalogLinePrice(
    opts.media,
    opts.priceOptionIndex,
  );
  const unitWon = catalogPriceFieldToWon(rawPrice);
  const mediaItem = adminMediaDtoToMediaItem(opts.media);
  const priceOpt =
    opts.media.priceOptions?.[Math.max(0, opts.priceOptionIndex)] ?? null;

  let autoAmount = 0;
  let usesMediaPartialRate = false;
  let usesProRataFallback = false;

  if (opts.billing.mode === "calendar_months" && period === "month") {
    const n = Math.max(1, Math.round(opts.billing.calendarMonths));
    autoAmount = Math.round(unitWon * n * qty);
  } else {
    const days =
      opts.billing.mode === "day_preset"
        ? Math.max(1, Math.round(opts.billing.presetDays))
        : Math.max(0, opts.billing.days);
    const periodKey = quotePeriodLookupKeyFromDays(days);
    const partialRate =
      periodKey != null
        ? resolvePartialPeriodRate(mediaItem, priceOpt, periodKey)
        : null;

    if (partialRate != null) {
      autoAmount = Math.round(
        quoteLineTotalWonFromPartialRate(unitWon, partialRate) * qty,
      );
      usesMediaPartialRate = true;
    } else {
      autoAmount = computeAdminCatalogLineAmount(
        rawPrice,
        period,
        days,
        qty,
        factor,
      );
      if (
        opts.billing.mode === "day_preset" ||
        opts.billing.mode === "custom_dates"
      ) {
        usesProRataFallback = true;
      } else if (opts.billing.mode === "calendar_months") {
        // 월단가가 아닌 매체(일/주)를 개월 모드로 잡은 경우 — 실제 일수로 환산
        usesProRataFallback = true;
      }
    }
  }

  const override = opts.amountOverrideWon;
  const amountOverridden =
    override != null && Number.isFinite(override) && override >= 0;
  const amount = amountOverridden ? Math.round(override!) : autoAmount;

  return {
    autoAmount,
    amount,
    usesMediaPartialRate,
    usesProRataFallback,
    amountOverridden,
  };
}

export function inferPriceOptionIndexFromMediaName(
  m: AdminMediaDto,
  mediaName: string,
  storedIndex: number,
): number {
  if (storedIndex > 0) return storedIndex;
  const match = mediaName.trim().match(/\(([^)]+)\)\s*$/);
  if (!match) return 0;
  const label = match[1]!.trim();
  const idx = (m.priceOptions ?? []).findIndex((o) => o.label === label);
  return idx >= 0 ? idx : 0;
}

export function hydrateAdminQuoteLinesFromItems(
  items: QuoteItemApi[],
  medias: AdminMediaDto[],
): AdminQuoteLine[] {
  const byId = new Map(medias.map((m) => [m.id, m]));
  const lines: AdminQuoteLine[] = [];

  for (const item of items) {
    const mediaId = item.mediaId?.trim() ?? "";
    const isCustom = !mediaId || mediaId.startsWith("custom-");

    // 카탈로그 mediaId 는 목록에 없어도 catalog 로 유지한다.
    // (take 한도로 누락된 매체를 custom 으로 강등하면 개월×단가 청구가 깨짐)
    if (!isCustom) {
      const m = byId.get(mediaId);
      const { displaySpec, meta } = decodeAdminQuoteItemSpec(item.spec);
      const priceOptionIndex = m
        ? inferPriceOptionIndexFromMediaName(
            m,
            item.mediaName,
            meta.priceOptionIndex,
          )
        : Math.max(0, meta.priceOptionIndex ?? 0);
      void displaySpec;
      lines.push({
        kind: "catalog",
        lineId: newAdminQuoteLineId("h"),
        mediaId,
        priceOptionIndex,
        quantity: Math.max(1, item.quantity),
        amountOverrideWon: meta.amountOverrideWon ?? null,
      });
      continue;
    }

    const customId =
      mediaId.replace(/^custom-/, "") || `item-${item.id}`;

    lines.push({
      kind: "custom",
      lineId: customId,
      name: item.mediaName,
      quantity: Math.max(1, item.quantity),
      unitPriceWon: item.unitPrice,
    });
  }

  return lines;
}

export function buildAdminQuoteLineItems(opts: {
  lines: AdminQuoteLine[];
  medias: AdminMediaDto[];
  isKo: boolean;
  campaignPeriodLabel: string;
  /** @deprecated use billing */
  days?: number;
  factorForPeriod?: (p: AdminQuotePeriodKey, d: number) => number;
  billing?: AdminQuoteBillingContext;
}): AdminQuoteBuiltLineItem[] {
  const { lines, medias, isKo, campaignPeriodLabel } = opts;
  const factorForPeriod = opts.factorForPeriod ?? adminFactorForPeriod;
  const billing: AdminQuoteBillingContext =
    opts.billing ??
    ({
      mode: "custom_dates",
      calendarMonths: 1,
      presetDays: opts.days ?? 30,
      days: opts.days ?? 30,
      startDate: "1970-01-01",
      endDate: "1970-01-01",
    } satisfies AdminQuoteBillingContext);

  const byId = new Map(medias.map((m) => [m.id, m]));
  const out: AdminQuoteBuiltLineItem[] = [];

  for (const line of lines) {
    if (line.kind === "custom") {
      const qty = Math.max(1, line.quantity);
      const unit = Math.max(0, Math.round(line.unitPriceWon));
      const amount = Math.round(unit * qty);
      if (amount <= 0 && !line.name.trim()) continue;
      out.push({
        lineId: line.lineId,
        mediaId: `custom-${line.lineId}`,
        mediaName: line.name.trim() || (isKo ? "기타 비용" : "Other cost"),
        spec: "—",
        period: campaignPeriodLabel,
        unitPrice: unit,
        unitPeriod: "month",
        quantity: qty,
        amount,
        autoAmount: amount,
      });
      continue;
    }

    const m = byId.get(line.mediaId);
    if (!m) continue;
    const qty = Math.max(1, line.quantity);
    const { rawPrice, period, label } = catalogLinePrice(
      m,
      line.priceOptionIndex,
    );
    const billed = resolveAdminCatalogLineBilling({
      media: m,
      priceOptionIndex: line.priceOptionIndex,
      quantity: qty,
      billing,
      amountOverrideWon: line.amountOverrideWon,
      factorForPeriod,
    });
    const unitWon = catalogPriceFieldToWon(rawPrice);
    const catalogOnInquiry = !(Number.isFinite(unitWon) && unitWon > 0);
    const priceOnInquiry = catalogOnInquiry && !billed.amountOverridden;
    /** override된 문의 라인은 단가도 협의가÷수량으로 표시·PDF에 맞춤 */
    const displayUnitWon =
      catalogOnInquiry && billed.amountOverridden
        ? Math.round(billed.amount / qty)
        : unitWon;
    const nameBase = isKo ? m.name : (m.nameEn || m.name) || m.name;
    const mediaName = label ? `${nameBase} (${label})` : nameBase;
    const displaySpec = mediaSpecLine(m);
    const quantityLabel = formatPlannerQuantityLabel(
      adminMediaDtoToMediaItem(m),
      qty,
      isKo,
      { [m.id]: line.priceOptionIndex },
    );
    out.push({
      lineId: line.lineId,
      mediaId: m.id,
      mediaName,
      spec: encodeAdminQuoteItemSpec(displaySpec, {
        priceOptionIndex: line.priceOptionIndex,
        quantityLabel,
        ...(billed.amountOverridden
          ? { amountOverrideWon: billed.amount }
          : {}),
      }),
      period: campaignPeriodLabel,
      unitPrice: displayUnitWon,
      unitPeriod: period,
      quantity: qty,
      quantityLabel,
      amount: billed.amount,
      autoAmount: billed.autoAmount,
      usesMediaPartialRate: billed.usesMediaPartialRate,
      usesProRataFallback: billed.usesProRataFallback,
      amountOverridden: billed.amountOverridden,
      priceOnInquiry,
    });
  }

  return out;
}

export function adminQuoteLineAmounts(
  lineItems: AdminQuoteBuiltLineItem[],
): number[] {
  return lineItems.map((it) => it.amount);
}
