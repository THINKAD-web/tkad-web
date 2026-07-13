import type { AdminMediaDto } from "@/lib/admin-media-dto";
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
};

export type AdminQuoteCustomLine = {
  kind: "custom";
  lineId: string;
  name: string;
  quantity: number;
  unitPriceWon: number;
};

export type AdminQuoteLine = AdminQuoteCatalogLine | AdminQuoteCustomLine;

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
  /** 매체·옵션 부분기간 요율 적용 */
  usesMediaPartialRate?: boolean;
};

export function newAdminQuoteLineId(prefix = "l"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCatalogQuoteLine(
  mediaId: string,
  opts?: { priceOptionIndex?: number; quantity?: number },
): AdminQuoteCatalogLine {
  return {
    kind: "catalog",
    lineId: newAdminQuoteLineId(),
    mediaId,
    priceOptionIndex: opts?.priceOptionIndex ?? 0,
    quantity: Math.max(1, opts?.quantity ?? 1),
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

/** 카탈로그 라인 — partial rate 우선, 없으면 monthFactorFromDays 계열 */
export function computeAdminCatalogLineAmountForMedia(
  m: AdminMediaDto,
  priceOptionIndex: number,
  days: number,
  quantity: number,
  factorForPeriod: (p: AdminQuotePeriodKey, d: number) => number,
): { amount: number; usesMediaPartialRate: boolean } {
  const qty = Math.max(0, quantity);
  const { rawPrice, period } = catalogLinePrice(m, priceOptionIndex);
  const mediaItem = adminMediaDtoToMediaItem(m);
  const priceOpt = m.priceOptions?.[Math.max(0, priceOptionIndex)] ?? null;
  const periodKey = quotePeriodLookupKeyFromDays(days);
  const partialRate =
    periodKey != null
      ? resolvePartialPeriodRate(mediaItem, priceOpt, periodKey)
      : null;

  if (partialRate != null) {
    const unitWon = catalogPriceFieldToWon(rawPrice);
    return {
      amount: Math.round(
        quoteLineTotalWonFromPartialRate(unitWon, partialRate) * qty,
      ),
      usesMediaPartialRate: true,
    };
  }

  return {
    amount: computeAdminCatalogLineAmount(
      rawPrice,
      period,
      days,
      qty,
      factorForPeriod,
    ),
    usesMediaPartialRate: false,
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

    if (!isCustom && byId.has(mediaId)) {
      const m = byId.get(mediaId)!;
      const { displaySpec, meta } = decodeAdminQuoteItemSpec(item.spec);
      const priceOptionIndex = inferPriceOptionIndexFromMediaName(
        m,
        item.mediaName,
        meta.priceOptionIndex,
      );
      void displaySpec;
      lines.push({
        kind: "catalog",
        lineId: newAdminQuoteLineId("h"),
        mediaId,
        priceOptionIndex,
        quantity: Math.max(1, item.quantity),
      });
      continue;
    }

    const customId = isCustom
      ? mediaId.replace(/^custom-/, "") || `item-${item.id}`
      : `orphan-${item.id}`;

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
  days: number;
  factorForPeriod: (p: AdminQuotePeriodKey, d: number) => number;
}): AdminQuoteBuiltLineItem[] {
  const { lines, medias, isKo, campaignPeriodLabel, days, factorForPeriod } =
    opts;
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
    const { amount, usesMediaPartialRate } = computeAdminCatalogLineAmountForMedia(
      m,
      line.priceOptionIndex,
      days,
      qty,
      factorForPeriod,
    );
    const unitWon = catalogPriceFieldToWon(rawPrice);
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
      }),
      period: campaignPeriodLabel,
      unitPrice: unitWon,
      unitPeriod: period,
      quantity: qty,
      quantityLabel,
      amount,
      usesMediaPartialRate,
    });
  }

  return out;
}

export function adminQuoteLineAmounts(
  lineItems: AdminQuoteBuiltLineItem[],
): number[] {
  return lineItems.map((it) => it.amount);
}
