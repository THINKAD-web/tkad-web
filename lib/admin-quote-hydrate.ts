import type { QuoteApi } from "@/lib/admin-sales-quote";

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

export type HydratedCustomLine = {
  id: string;
  name: string;
  quantity: number;
  unitPriceWon: number;
};

export function splitQuoteItemsForForm(
  quote: QuoteApi,
  knownMediaIds: Set<string>,
): {
  selectedIds: string[];
  quantities: Record<string, number>;
  customLines: HydratedCustomLine[];
} {
  const selectedIds: string[] = [];
  const quantities: Record<string, number> = {};
  const customLines: HydratedCustomLine[] = [];

  for (const item of quote.items) {
    const mediaId = item.mediaId?.trim() ?? "";
    const isCustom = !mediaId || mediaId.startsWith("custom-");

    if (!isCustom && knownMediaIds.has(mediaId)) {
      selectedIds.push(mediaId);
      quantities[mediaId] = Math.max(1, item.quantity);
      continue;
    }

    const customId = isCustom
      ? mediaId.replace(/^custom-/, "") || `item-${item.id}`
      : `orphan-${item.id}`;

    customLines.push({
      id: customId,
      name: item.mediaName,
      quantity: Math.max(1, item.quantity),
      unitPriceWon: item.unitPrice,
    });
  }

  return { selectedIds, quantities, customLines };
}

/** 저장된 합계 필드로 부가세 포함 여부 추정 */
export function inferVatIncludedFromQuote(quote: QuoteApi): boolean {
  const net = quote.subtotal - quote.discount;
  return Math.abs(quote.total - net) < 2;
}
