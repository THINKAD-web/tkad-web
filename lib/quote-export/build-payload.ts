import type { PrismaClient } from "@prisma/client";
import { calculateQuoteFromMediaIds } from "@/lib/quote-calculator";
import { CONTACT_EMAIL } from "@/lib/constants";
import { estimateEndDate, periodLabelFromKey } from "@/lib/ooh-quote";
import type { QuoteExportPayload, QuoteExportTemplate } from "@/lib/quote-export/types";

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
    lines: breakdown.lines.map((l) => ({
      name: l.mediaName,
      location: l.location,
      unitPriceWon: l.unitPriceWon,
      lineSupplyWon: l.lineSupplyWon,
      impressions: l.impressions,
    })),
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
    stampUrl: process.env.QUOTE_STAMP_URL || undefined,
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
