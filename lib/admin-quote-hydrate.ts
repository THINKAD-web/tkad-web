import type { AdminMediaDto } from "@/lib/admin-media-dto";
import type { QuoteApi } from "@/lib/admin-sales-quote";
import {
  hydrateAdminQuoteLinesFromItems,
  type AdminQuoteLine,
} from "@/lib/admin-quote-lines";

export function parseStoredClientName(stored: string): {
  company: string;
  contact: string;
} {
  const parts = stored.split(" · ").map((p) => p.trim());
  if (parts.length >= 2) {
    return { company: parts[0]!, contact: parts.slice(1).join(" · ") };
  }
  return { company: "", contact: stored.trim() };
}

export function parseCampaignPeriodLabel(
  period: string,
): { startDate: string; endDate: string } | null {
  const m = period.trim().match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  return { startDate: m[1]!, endDate: m[2]! };
}

/** 저장된 QuoteItem → 편집 폼 lines[] (멀티 라인·옵션 인덱스 보존) */
export function splitQuoteItemsForForm(
  quote: QuoteApi,
  medias: AdminMediaDto[],
): { lines: AdminQuoteLine[] } {
  return { lines: hydrateAdminQuoteLinesFromItems(quote.items, medias) };
}

/** 저장된 합계 필드로 부가세 포함 여부 추정 */
export function inferVatIncludedFromQuote(quote: QuoteApi): boolean {
  const net = quote.subtotal - quote.discount;
  return Math.abs(quote.total - net) < 2;
}
