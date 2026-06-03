import type { PrismaClient } from "@prisma/client";
import { calculateQuoteFromMediaIds } from "@/lib/quote-calculator";
import { CONTACT_EMAIL } from "@/lib/constants";
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
