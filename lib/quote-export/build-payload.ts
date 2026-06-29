import type { PrismaClient, Quote, QuoteItem } from "@prisma/client";
import { calculateQuoteFromMediaIds } from "@/lib/quote-calculator";
import { CONTACT_EMAIL } from "@/lib/constants";
import { estimateEndDate, periodLabelFromKey } from "@/lib/ooh-quote";
import { mediaToDocumentDetail } from "@/lib/document-media-detail";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { getQuoteStampUrl } from "@/lib/quote-stamp";
import type { QuoteExportPayload, QuoteExportTemplate } from "@/lib/quote-export/types";
import type { QuoteExportLine } from "@/lib/quote-export/types";

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
};

const DAY = 86_400_000;

export async function buildQuoteExportPayload(
  db: Pick<PrismaClient, "media">,
  row: QuoteExportSourceRow,
  template: QuoteExportTemplate,
): Promise<QuoteExportPayload> {
  const isKo = !row.locale || row.locale.toLowerCase().startsWith("ko");
  const now = new Date();
  const start = row.startDate ?? now;
  const end = row.endDate ?? new Date(start.getTime() + 30 * DAY);

  const breakdown = await calculateQuoteFromMediaIds(db, {
    mediaIds: row.mediaIds,
    startDate: start,
    endDate: end,
    issuedAt: now,
  });

  const mediaIds = breakdown.lines.map((l) => l.mediaId);
  const mediaRows = await db.media.findMany({
    where: { id: { in: mediaIds }, isActive: true },
    select: {
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
      priceOptions: true,
    },
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
  const blendedCpmWon =
    totalImpressions > 0
      ? Math.round((breakdown.supplyWon / totalImpressions) * 1000)
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
    periodLabel: row.period || `${breakdown.periodDays}${isKo ? "일" : " days"}`,
    lines: breakdown.lines.map((l) =>
      mapQuoteExportLine(l, mediaById.get(l.mediaId), isKo),
    ),
    supplyWon: breakdown.supplyWon,
    vatWon: breakdown.vatWon,
    totalWon: breakdown.totalWon,
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
    select: {
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
      priceOptions: true,
    },
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
  location?: string;
  spec?: string;
  quantity?: number;
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
    return mapQuoteExportLine(
      {
        mediaId: r.mediaId ?? r.name,
        mediaName: r.name,
        location,
        unitPriceWon: r.unitPriceWon,
        lineSupplyWon: r.lineTotalWon,
        impressions: media?.impressions ?? 0,
      },
      media,
      input.isKo,
    );
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
): QuoteExportLine {
  const base: QuoteExportLine = {
    mediaId: line.mediaId,
    name: line.mediaName,
    location: line.location,
    unitPriceWon: line.unitPriceWon,
    lineSupplyWon: line.lineSupplyWon,
    impressions: line.impressions,
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
    { isKo, lineTotalWon: line.lineSupplyWon },
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
