import type { PrismaClient, Quote, QuoteItem } from "@prisma/client";
import { calculateQuoteFromMediaIds } from "@/lib/quote-calculator";
import { CONTACT_EMAIL } from "@/lib/constants";
import { estimateEndDate, periodLabelFromKey } from "@/lib/ooh-quote";
import { mediaToDocumentDetail } from "@/lib/document-media-detail";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { getQuoteStampUrl } from "@/lib/quote-stamp";
import type { QuoteExportPayload, QuoteExportTemplate } from "@/lib/quote-export/types";
import type { QuoteExportLine } from "@/lib/quote-export/types";
import {
  mediaPriceOptionIndexFromSelections,
  parseQuoteMediaSelections,
  selectionsByMediaId,
  type QuoteMediaSelectionSnapshot,
} from "@/lib/quote-media-selections";
import type { DocumentBroadcastResolveOpts } from "@/lib/document-media-detail";
import {
  buildQuoteWizardLineContext,
  isQuoteCampaignPeriodKey,
  quoteCampaignDaysFromPeriodKey,
  resolveQuoteCampaignPeriodSummaryLabel,
} from "@/lib/quote-wizard-pricing";
import type { MediaItem, MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import {
  parsePartialPeriodRatesFromPriceOptionRow,
  parsePartialPeriodRatesRaw,
} from "@/lib/media-partial-period-rates";

/** OoHQuote 에서 필요한 필드만 */
export type QuoteExportSourceRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientCompany: string | null;
  mediaIds: string[];
  period: string;
  periodKey: string | null;
  startDate: Date | null;
  endDate: Date | null;
  locale: string | null;
  pdfTemplate?: string | null;
  mediaPriceOptionIndex?: Record<string, number>;
  /** DB `media_selections` JSON — 제출 시점 옵션 스냅샷 */
  mediaSelections?: QuoteMediaSelectionSnapshot[] | unknown;
};

const DAY = 86_400_000;

function parseExportPriceOptions(raw: unknown): MediaItem["priceOptions"] {
  if (!Array.isArray(raw)) return undefined;
  const normalized: MediaPriceOption[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.label !== "string" || typeof o.price !== "number") continue;
    const optionPartialRates = parsePartialPeriodRatesFromPriceOptionRow(o);
    normalized.push({
      label: o.label,
      price: o.price,
      period:
        typeof o.period === "string"
          ? (o.period as MediaPricePeriodKey)
          : undefined,
      ...(optionPartialRates ? { partialPeriodRates: optionPartialRates } : {}),
    });
  }
  return normalized.length ? normalized : undefined;
}

const quoteExportMediaSelect = {
  id: true,
  name: true,
  location: true,
  width: true,
  height: true,
  operatingHours: true,
  dailyFootfall: true,
  impressions: true,
  image: true,
  extractedImages: true,
  mediaMainCategory: true,
  mediaSubCategory: true,
  type: true,
  price: true,
  pricePeriod: true,
  priceOptions: true,
  partialPeriodRates: true,
} as const;

function mixedPeriodSummaryLabel(isKo: boolean): string {
  return isKo ? "{period} (매체별 상이)" : "{period} (varies by media)";
}

function resolveExportPeriodLabel(opts: {
  row: QuoteExportSourceRow;
  isKo: boolean;
  mediaSelections: QuoteMediaSelectionSnapshot[] | undefined;
  selectionMap: Map<string, QuoteMediaSelectionSnapshot>;
  breakdownLineDays: number[];
}): string {
  const base =
    opts.row.period ||
    (opts.row.periodKey
      ? periodLabelFromKey(opts.row.periodKey, opts.isKo ? "ko" : "en")
      : "");
  if (!opts.row.periodKey || !isQuoteCampaignPeriodKey(opts.row.periodKey)) {
    return base;
  }
  const globalDays = quoteCampaignDaysFromPeriodKey(opts.row.periodKey);
  const lineDays =
    opts.breakdownLineDays.length > 0
      ? opts.breakdownLineDays
      : opts.row.mediaIds.map((id) => {
          const snap = opts.selectionMap.get(id);
          if (snap?.usePackagePeriod && snap.lineCampaignDays != null) {
            return snap.lineCampaignDays;
          }
          return globalDays;
        });
  return resolveQuoteCampaignPeriodSummaryLabel({
    campaignPeriodLabel: base,
    globalCampaignDays: globalDays,
    lineCampaignDays: lineDays,
    isKo: opts.isKo,
    mixedLabel: mixedPeriodSummaryLabel(opts.isKo),
  });
}

function mediaItemForExportLine(row: {
  id: string;
  name: string;
  location: string;
  type: string;
  price: number;
  pricePeriod: string | null;
  image: string | null;
  extractedImages: string[];
  dailyFootfall: number | null;
  impressions: number | null;
  priceOptions: unknown;
  partialPeriodRates: unknown;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
}): MediaItem {
  const partialPeriodRates =
    parsePartialPeriodRatesRaw(row.partialPeriodRates) ?? undefined;
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name,
    location: row.location,
    locationEn: row.location,
    region: "",
    type: row.type as MediaItem["type"],
    price: row.price,
    pricePeriod: (row.pricePeriod ?? "month") as MediaPricePeriodKey,
    sampleImages: [...(row.image ? [row.image] : []), ...row.extractedImages],
    lat: 0,
    lng: 0,
    dailyFootTraffic: row.dailyFootfall ?? 0,
    impressions: row.impressions ?? undefined,
    priceOptions: parseExportPriceOptions(row.priceOptions),
    ...(partialPeriodRates ? { partialPeriodRates } : {}),
    mediaMainCategory: row.mediaMainCategory,
    mediaSubCategory: row.mediaSubCategory,
  };
}

export async function buildQuoteExportPayload(
  db: Pick<PrismaClient, "media">,
  row: QuoteExportSourceRow,
  template: QuoteExportTemplate,
): Promise<QuoteExportPayload> {
  const isKo = !row.locale || row.locale.toLowerCase().startsWith("ko");
  const now = new Date();
  const start = row.startDate ?? now;
  const end = row.endDate ?? new Date(start.getTime() + 30 * DAY);

  const mediaSelections = parseQuoteMediaSelections(row.mediaSelections);
  const selectionMap = selectionsByMediaId(mediaSelections);
  const resolvedOptionIndex =
    mediaPriceOptionIndexFromSelections(mediaSelections) ??
    row.mediaPriceOptionIndex;

  const breakdown = await calculateQuoteFromMediaIds(db, {
    mediaIds: row.mediaIds,
    startDate: start,
    endDate: end,
    issuedAt: now,
    periodKey: row.periodKey ?? undefined,
    mediaPriceOptionIndex: resolvedOptionIndex,
    mediaSelections,
  });

  const mediaIds = breakdown.lines.map((l) => l.mediaId);
  const mediaRows = await db.media.findMany({
    where: { id: { in: mediaIds }, isActive: true },
    select: quoteExportMediaSelect,
  });
  const mediaById = new Map(mediaRows.map((m) => [m.id, m]));

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);

  const totalImpressions = breakdown.lines.reduce(
    (s, l) => s + (l.impressions || 0),
    0,
  );

  const periodLabel = resolveExportPeriodLabel({
    row,
    isKo,
    mediaSelections,
    selectionMap,
    breakdownLineDays: breakdown.lines.map((l) => l.periodDays),
  });

  const mappedLines = breakdown.lines.map((l) => {
    const snap = selectionMap.get(l.mediaId);
    const poIdx =
      snap?.priceOptionIndex ??
      resolvedOptionIndex?.[l.mediaId] ??
      0;
    const mediaRow = mediaById.get(l.mediaId);
    let executionPeriodLabel: string | undefined;
    let prorationLabel: string | undefined;
    if (
      mediaRow &&
      row.periodKey &&
      isQuoteCampaignPeriodKey(row.periodKey)
    ) {
      const wizardLine = buildQuoteWizardLineContext(
        mediaItemForExportLine(mediaRow),
        {
          isKo,
          campaignPeriod: row.periodKey,
          campaignPeriodLabel: row.period,
          priceOptionIndex: poIdx,
          usePackagePeriod: snap?.usePackagePeriod === true,
        },
      );
      executionPeriodLabel = wizardLine.executionPeriodLabel;
      if (wizardLine.usesMediaPartialRate && wizardLine.prorationLabel) {
        prorationLabel = wizardLine.prorationLabel;
      }
    }
    const base = mapQuoteExportLine(
      l,
      mediaRow,
      isKo,
      snap
        ? {
            priceOptionIndex: poIdx,
            optionDescription: snap.optionDescription,
            optionLabel: snap.optionLabel,
            optionPriceWon: snap.optionPriceWon,
          }
        : { priceOptionIndex: poIdx },
    );
    const withPeriod = executionPeriodLabel
      ? { ...base, executionPeriodLabel }
      : base;
    const withProration = prorationLabel
      ? { ...withPeriod, prorationLabel }
      : withPeriod;
    const fromLine = {
      ...(l.quantity != null ? { quantity: l.quantity } : {}),
      ...(l.quantityLabel ? { quantityLabel: l.quantityLabel } : {}),
    };
    if (!snap) {
      return Object.keys(fromLine).length > 0
        ? { ...withProration, ...fromLine }
        : withProration;
    }
    const mediaName = mediaById.get(l.mediaId)?.name ?? base.name;
    const optSuffix = snap.optionLabel ? ` (${snap.optionLabel})` : "";
    return {
      ...withProration,
      name: snap.optionLabel ? `${mediaName}${optSuffix}` : base.name,
      unitPriceWon: snap.optionPriceWon,
      lineSupplyWon: snap.lineTotalWon,
      ...(snap.quantity != null ? { quantity: snap.quantity } : {}),
      ...(snap.quantityLabel ? { quantityLabel: snap.quantityLabel } : {}),
    };
  });

  const linesSubtotalWon = mappedLines.reduce(
    (s, line) => s + line.lineSupplyWon,
    0,
  );
  const supplyWon =
    mediaSelections?.length && linesSubtotalWon > 0
      ? linesSubtotalWon
      : breakdown.supplyWon;
  const vatWon = Math.round(supplyWon * 0.1);
  const totalWon = supplyWon + vatWon;
  const blendedCpmWon =
    totalImpressions > 0
      ? Math.round((supplyWon / totalImpressions) * 1000)
      : null;

  return {
    template,
    isKo,
    quoteNo: row.id.slice(-8).toUpperCase(),
    issuedAt: fmtDate(now),
    validUntil: fmtDate(breakdown.validUntilDate),
    clientCompany: row.clientCompany || row.clientName || (isKo ? "고객사명" : "Client"),
    clientName: row.clientName || (isKo ? "담당자" : "Contact"),
    clientEmail: row.clientEmail || undefined,
    clientPhone: row.clientPhone || undefined,
    periodLabel,
    lines: mappedLines,
    supplyWon,
    vatWon,
    totalWon,
    totalImpressions,
    blendedCpmWon,
    issuer: {
      company: isKo ? "주식회사 싱커드 (THINKAD)" : "THINKAD Inc.",
      email: CONTACT_EMAIL,
      phone: "02-515-2772",
      address: isKo
        ? "서울 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호"
        : "Seongsu, Seongdong-gu, Seoul, Korea",
    },
    stampUrl: getQuoteStampUrl(),
  };
}

function quoteIssuerBlock(isKo: boolean) {
  return {
    company: isKo ? "주식회사 싱커드 (THINKAD)" : "THINKAD Inc.",
    email: CONTACT_EMAIL,
    phone: "02-515-2772",
    address: isKo
      ? "서울 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호"
      : "Seongsu, Seongdong-gu, Seoul, Korea",
  };
}

function formatQuoteExportDate(d: Date, isKo: boolean): string {
  return new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

async function loadMediaMapForExport(
  db: Pick<PrismaClient, "media">,
  mediaIds: string[],
) {
  const ids = [...new Set(mediaIds.filter((id) => id && !id.startsWith("custom-")))];
  if (ids.length === 0) return new Map<string, Awaited<ReturnType<typeof db.media.findMany>>[number]>();
  const mediaRows = await db.media.findMany({
    where: { id: { in: ids }, isActive: true },
    select: quoteExportMediaSelect,
  });
  return new Map(mediaRows.map((m) => [m.id, m]));
}

/** Admin 저장 견적 → 공개 견적서와 동일 PDF 페이로드 */
export async function buildQuoteExportPayloadFromAdminQuote(
  db: Pick<PrismaClient, "media">,
  quote: Quote & { items: QuoteItem[] },
  template: QuoteExportTemplate = "basic",
): Promise<QuoteExportPayload> {
  const isKo = quote.isKo;
  const sep = " · ";
  const ci = quote.clientName.indexOf(sep);
  const clientCompany =
    ci === -1 ? quote.clientName : quote.clientName.slice(0, ci).trim() || quote.clientName;
  const clientContact =
    ci === -1 ? "—" : quote.clientName.slice(ci + sep.length).trim() || "—";

  const mediaIds = quote.items
    .map((it) => it.mediaId)
    .filter((id): id is string => !!id && !id.startsWith("custom-"));
  const mediaById = await loadMediaMapForExport(db, mediaIds);

  const periods = [...new Set(quote.items.map((i) => i.period))];
  const periodLabel =
    periods.length === 0 ? "—" : periods.length <= 2 ? periods.join(", ") : `${periods[0]} 외`;

  const lines: QuoteExportLine[] = quote.items.map((it) => {
    const media = it.mediaId ? mediaById.get(it.mediaId) : undefined;
    const location = media?.location ?? "—";
    return mapQuoteExportLine(
      {
        mediaId: it.mediaId ?? it.id,
        mediaName: it.mediaName,
        location,
        unitPriceWon: it.unitPrice,
        lineSupplyWon: it.amount,
        impressions: media?.impressions ?? 0,
      },
      media,
      isKo,
    );
  });

  const totalImpressions = lines.reduce((s, l) => s + (l.impressions || 0), 0);
  const supplyWon = Math.max(0, quote.subtotal - quote.discount);

  return {
    template,
    isKo,
    quoteNo: quote.quoteNumber,
    issuedAt: formatQuoteExportDate(quote.createdAt, isKo),
    validUntil: formatQuoteExportDate(quote.validUntil, isKo),
    clientCompany,
    clientName: clientContact,
    clientEmail: quote.clientEmail ?? undefined,
    clientPhone: quote.clientPhone ?? undefined,
    periodLabel,
    lines,
    supplyWon,
    vatWon: quote.tax,
    totalWon: quote.total,
    linesSubtotalWon: quote.subtotal,
    discountTotalWon: quote.discount > 0 ? quote.discount : undefined,
    discountSummary:
      quote.discount > 0
        ? isKo
          ? "할인"
          : "Discount"
        : undefined,
    vatIncluded: false,
    totalImpressions,
    blendedCpmWon:
      totalImpressions > 0
        ? Math.round((supplyWon / totalImpressions) * 1000)
        : null,
    issuer: quoteIssuerBlock(isKo),
    stampUrl: getQuoteStampUrl(),
  };
}

export type AdminQuoteDraftExportRow = {
  mediaId?: string | null;
  name: string;
  period: string;
  unitPriceWon: number;
  lineTotalWon: number;
  priceOnInquiry?: boolean;
  location?: string;
  spec?: string;
  quantity?: number;
  quantityLabel?: string;
};

/** Admin 견적 초안(저장 전) POST — 동일 디자인 PDF */
export async function buildQuoteExportPayloadFromAdminDraft(
  db: Pick<PrismaClient, "media">,
  input: {
    quoteNumber: string;
    issueDate: string;
    validUntil: string;
    clientCompany: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    periodLabel: string;
    isKo: boolean;
    supplyWon: number;
    vatWon: number;
    totalWon: number;
    linesSubtotalWon?: number;
    discountTotalWon?: number;
    discountSummary?: string;
    vatIncluded?: boolean;
    rows: AdminQuoteDraftExportRow[];
  },
  template: QuoteExportTemplate = "basic",
): Promise<QuoteExportPayload> {
  const mediaIds = input.rows
    .map((r) => r.mediaId)
    .filter((id): id is string => !!id && !id.startsWith("custom-"));
  const mediaById = await loadMediaMapForExport(db, mediaIds);

  const lines: QuoteExportLine[] = input.rows.map((r) => {
    const media = r.mediaId ? mediaById.get(r.mediaId) : undefined;
    const location = r.location?.trim() || media?.location || "—";
    const base = mapQuoteExportLine(
      {
        mediaId: r.mediaId ?? r.name,
        mediaName: r.name,
        location,
        unitPriceWon: r.unitPriceWon,
        lineSupplyWon: r.lineTotalWon,
        impressions: media?.impressions ?? 0,
        priceOnInquiry: r.priceOnInquiry,
      },
      media,
      input.isKo,
    );
    return r.quantity != null && r.quantity > 0
      ? {
          ...base,
          quantity: r.quantity,
          ...(r.quantityLabel ? { quantityLabel: r.quantityLabel } : {}),
        }
      : base;
  });

  const totalImpressions = lines.reduce((s, l) => s + (l.impressions || 0), 0);
  const issue = new Date(`${input.issueDate.slice(0, 10)}T12:00:00`);
  const valid = new Date(`${input.validUntil.slice(0, 10)}T12:00:00`);

  return {
    template,
    isKo: input.isKo,
    quoteNo: input.quoteNumber,
    issuedAt: formatQuoteExportDate(issue, input.isKo),
    validUntil: formatQuoteExportDate(valid, input.isKo),
    clientCompany: input.clientCompany,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    periodLabel: input.periodLabel,
    lines,
    supplyWon: input.supplyWon,
    vatWon: input.vatWon,
    totalWon: input.totalWon,
    linesSubtotalWon: input.linesSubtotalWon,
    discountTotalWon: input.discountTotalWon,
    discountSummary: input.discountSummary,
    vatIncluded: input.vatIncluded,
    /** 어드민 카드형 PDF ↔ 공식 견적서 금액 단위 통일 (원) */
    amountUnit: "won",
    totalImpressions,
    blendedCpmWon:
      totalImpressions > 0
        ? Math.round((input.supplyWon / totalImpressions) * 1000)
        : null,
    issuer: quoteIssuerBlock(input.isKo),
    stampUrl: getQuoteStampUrl(),
  };
}

function browseLabel(
  mainId: string | null | undefined,
  subId: string | null | undefined,
  isKo: boolean,
): string | undefined {
  const main = mainId ? MEDIA_CATEGORIES.find((c) => c.id === mainId) : undefined;
  const sub = main?.sub.find((s) => s.id === subId);
  const mainLabel = main ? (isKo ? main.label : main.labelEn ?? main.label) : undefined;
  const subLabel = sub ? (isKo ? sub.label : sub.labelEn ?? sub.label) : undefined;
  if (mainLabel && subLabel) return `${mainLabel} · ${subLabel}`;
  return mainLabel ?? subLabel;
}

function mapQuoteExportLine(
  line: {
    mediaId: string;
    mediaName: string;
    location: string;
    unitPriceWon: number;
    lineSupplyWon: number;
    impressions: number;
    priceOnInquiry?: boolean;
  },
  row:
    | {
        id: string;
        name: string;
        location: string;
        width: string | null;
        height: string | null;
        operatingHours: string | null;
        dailyFootfall: number | null;
        impressions: number | null;
        image: string | null;
        extractedImages: string[];
        mediaMainCategory: string | null;
        mediaSubCategory: string | null;
        type: string;
        priceOptions: unknown;
      }
    | undefined,
  isKo: boolean,
  broadcastOpts?: DocumentBroadcastResolveOpts,
): QuoteExportLine {
  const base: QuoteExportLine = {
    mediaId: line.mediaId,
    name: line.mediaName,
    location: line.location,
    unitPriceWon: line.unitPriceWon,
    lineSupplyWon: line.lineSupplyWon,
    impressions: line.impressions,
    ...(line.priceOnInquiry ? { priceOnInquiry: true } : {}),
  };
  if (!row) return base;

  const size =
    row.width && row.height ? `${row.width} × ${row.height}` : undefined;
  const detail = mediaToDocumentDetail(
    {
      id: row.id,
      name: row.name,
      location: row.location,
      size,
      operatingHours: row.operatingHours,
      dailyFootfall: row.dailyFootfall,
      impressions: row.impressions,
      sampleImages: [...(row.image ? [row.image] : []), ...row.extractedImages],
      mediaMainCategory: row.mediaMainCategory,
      mediaSubCategory: row.mediaSubCategory,
      type: row.type,
      priceOptions: row.priceOptions as never,
    },
    { isKo, lineTotalWon: line.lineSupplyWon, ...broadcastOpts },
  );

  return {
    ...base,
    thumbUrl: detail.thumbUrl,
    size: detail.size,
    operatingHours: detail.operatingHours,
    dailyTraffic: detail.dailyTraffic,
    broadcastLabel: detail.broadcastLabel,
    categoryLabel: detail.categoryLabel,
    mediaTypeLabel: browseLabel(row.mediaMainCategory, row.mediaSubCategory, isKo),
    recommendReason: detail.recommendReason,
  };
}

/** OoHQuote.pdfTemplate → 템플릿 결정 (premium 외에는 basic) */
export function quoteTemplateFromRow(
  row: Pick<QuoteExportSourceRow, "pdfTemplate">,
): "basic" | "premium" {
  return row.pdfTemplate === "premium" ? "premium" : "basic";
}

/** 견적 마법사 Step 4 — DB 저장 전 초안 (OoHQuote 행 없이 동일 페이로드) */
export type QuoteWizardExportInput = {
  mediaIds: string[];
  periodKey: string;
  locale: string;
  template: QuoteExportTemplate;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientCompany?: string | null;
  mediaPriceOptionIndex?: Record<string, number>;
  /** 마법사 초안 — 제출 전 옵션·패키지 기간 스냅샷 */
  mediaSelections?: QuoteMediaSelectionSnapshot[];
};

export async function buildQuoteExportPayloadFromWizard(
  db: Pick<PrismaClient, "media">,
  input: QuoteWizardExportInput,
): Promise<QuoteExportPayload> {
  const isKo = input.locale !== "en";
  const startDate = new Date();
  const endDate = estimateEndDate(startDate, input.periodKey);
  const row: QuoteExportSourceRow = {
    id: `draft${Date.now().toString(36)}`,
    clientName: input.clientName || (isKo ? "담당자" : "Contact"),
    clientEmail: input.clientEmail || "",
    clientPhone: input.clientPhone ?? null,
    clientCompany: input.clientCompany ?? null,
    mediaIds: input.mediaIds,
    period: periodLabelFromKey(input.periodKey, input.locale),
    periodKey: input.periodKey,
    startDate,
    endDate,
    locale: input.locale,
    pdfTemplate: input.template === "premium" ? "premium" : "default",
    mediaPriceOptionIndex: input.mediaPriceOptionIndex,
    mediaSelections: input.mediaSelections,
  };
  return buildQuoteExportPayload(db, row, input.template);
}

/** 발송/이메일 공용 — 행 → 신규 디자인 PDF base64 (모든 견적 경로 통일) */
export async function quotePdfBase64FromRow(
  db: Pick<PrismaClient, "media">,
  row: QuoteExportSourceRow,
): Promise<string> {
  const payload = await buildQuoteExportPayload(db, row, quoteTemplateFromRow(row));
  const { buildQuotePdf } = await import("@/lib/quote-export/build-pdf");
  const bytes = await buildQuotePdf(payload);
  return Buffer.from(bytes).toString("base64");
}
