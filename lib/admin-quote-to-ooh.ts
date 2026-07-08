/**
 * Admin formal Quote → OoHQuote contract pipeline bridge.
 * ★ Amounts: Quote.total/subtotal/items are KRW (원); OoHQuote.totalAmount is 만원 (×10,000).
 */
import type { Quote, QuoteItem } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { OoHQuoteStatus } from "@prisma/client";
import { inclusiveCampaignDays } from "@/lib/admin-quote-calc";
import { parseStoredClientName, inferVatIncludedFromQuote } from "@/lib/admin-quote-hydrate";
import { decodeAdminQuoteItemSpec } from "@/lib/admin-quote-line-spec";
import { adminQuoteLineAmounts } from "@/lib/admin-quote-lines";
import { serializeQuote } from "@/lib/admin-sales-quote";
import type { QuoteBreakdown, QuoteLineItem } from "@/lib/quote-calculator";
import { periodLabelForDays } from "@/lib/quote-calculator";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";

export const WON_PER_MANWON = 10_000;

/** 원(KRW) → OoHQuote.totalAmount (만원, 반올림) */
export function wonToManwon(won: number): number {
  return Math.round(won / WON_PER_MANWON);
}

/** 만원 → 원 (역변환, 검증용) */
export function manwonToWon(manwon: number): number {
  return manwon * WON_PER_MANWON;
}

/**
 * Quote.total(원) ↔ OoHQuote.totalAmount(만원) 일치 검증.
 * 반올림 허용 오차: ±5,000원 (만원 단위 반올림).
 */
export function assertAmountBridgeConsistent(
  quoteTotalWon: number,
  totalAmountManwon: number,
): void {
  const roundTripWon = manwonToWon(totalAmountManwon);
  const diff = Math.abs(quoteTotalWon - roundTripWon);
  if (diff > WON_PER_MANWON / 2) {
    throw new Error(
      `Amount bridge mismatch: quote ${quoteTotalWon}원 vs OoH ${totalAmountManwon}만원 (Δ${diff}원)`,
    );
  }
}

function extractOptionLabel(mediaName: string): string | null {
  const m = mediaName.trim().match(/\(([^)]+)\)\s*$/);
  return m ? m[1]!.trim() : null;
}

function parsePeriodFromItems(items: QuoteItem[]): {
  startDate: Date | null;
  endDate: Date | null;
  periodLabel: string;
  periodDays: number;
} {
  const periodRaw = items[0]?.period?.trim() ?? "";
  const range = periodRaw.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  if (range) {
    const startDate = new Date(`${range[1]!}T12:00:00`);
    const endDate = new Date(`${range[2]!}T12:00:00`);
    const periodDays = inclusiveCampaignDays(startDate, endDate);
    return { startDate, endDate, periodLabel: periodRaw, periodDays };
  }
  return {
    startDate: null,
    endDate: null,
    periodLabel: periodRaw || "—",
    periodDays: 30,
  };
}

function inferPeriodKey(periodDays: number): string {
  if (periodDays >= 28 && periodDays <= 31) return "1month";
  if (periodDays <= 7) return "1week";
  if (periodDays <= 14) return "2weeks";
  if (periodDays <= 21) return "3weeks";
  return "1month";
}

function buildMediaSelections(items: QuoteItem[]): QuoteMediaSelectionSnapshot[] {
  const out: QuoteMediaSelectionSnapshot[] = [];
  for (const it of items) {
    const mediaId = it.mediaId?.trim() ?? "";
    if (!mediaId || mediaId.startsWith("custom-")) continue;
    const { meta } = decodeAdminQuoteItemSpec(it.spec);
    out.push({
      mediaId,
      priceOptionIndex: meta.priceOptionIndex,
      quantity: it.quantity,
      quantityLabel: meta.quantityLabel ?? null,
      optionLabel: extractOptionLabel(it.mediaName),
      optionPriceWon: it.unitPrice,
      lineTotalWon: it.amount,
    });
  }
  return out;
}

function buildQuoteBreakdown(
  quote: Quote & { items: QuoteItem[] },
  periodDays: number,
): QuoteBreakdown & { adminQuoteId: string; adminQuoteNumber: string } {
  const supplyWon = Math.max(0, quote.subtotal - quote.discount);
  const discountRate =
    quote.subtotal > 0
      ? Math.min(100, Math.max(0, (quote.discount / quote.subtotal) * 100))
      : 0;

  const lines: QuoteLineItem[] = quote.items.map((it) => ({
    mediaId: it.mediaId?.trim() || `custom-${it.id}`,
    mediaName: it.mediaName,
    location: "",
    periodDays,
    unitPriceWon: it.unitPrice,
    lineSupplyWon: it.amount,
    quantity: it.quantity,
    quantityLabel: decodeAdminQuoteItemSpec(it.spec).meta.quantityLabel,
  }));

  return {
    lines,
    subtotalWon: quote.subtotal,
    discountRate,
    discountWon: quote.discount,
    supplyWon,
    vatWon: quote.tax,
    totalWon: quote.total,
    validUntil: quote.validUntil.toISOString(),
    issuedAt: quote.createdAt.toISOString(),
    adminQuoteId: quote.id,
    adminQuoteNumber: quote.quoteNumber,
  };
}

/** 저장된 Quote 금액 필드·라인 합계 일치 검증 */
export function assertAdminQuoteStoredAmounts(
  quote: Quote & { items: QuoteItem[] },
): void {
  const lineWons = adminQuoteLineAmounts(
    quote.items.map((it) => ({
      lineId: it.id,
      mediaId: it.mediaId ?? `custom-${it.id}`,
      mediaName: it.mediaName,
      spec: it.spec ?? "—",
      period: it.period,
      unitPrice: it.unitPrice,
      unitPeriod: "month" as const,
      quantity: it.quantity,
      amount: it.amount,
    })),
  );
  const linesSum = lineWons.reduce((a, b) => a + b, 0);
  if (linesSum !== quote.subtotal) {
    throw new Error(
      `Quote subtotal mismatch: items ${linesSum}원 vs stored ${quote.subtotal}원`,
    );
  }

  const api = serializeQuote(quote);
  const vatIncluded = inferVatIncludedFromQuote(api);
  const supplyWon = quote.subtotal - quote.discount;
  if (vatIncluded) {
    if (Math.abs(quote.total - supplyWon) > 1) {
      throw new Error(`Quote total/supply mismatch (VAT included)`);
    }
  } else if (quote.total !== supplyWon + quote.tax) {
    throw new Error(
      `Quote total mismatch: ${quote.total} ≠ ${supplyWon} + ${quote.tax}`,
    );
  }
}

export type AdminQuoteToOoHBridgeResult = {
  totalAmountManwon: number;
  data: Prisma.OoHQuoteCreateInput;
};

/** Quote(+items) → OoHQuote create payload (draft). DB write는 호출측. */
export function buildOoHQuoteFromAdminQuote(
  quote: Quote & { items: QuoteItem[] },
): AdminQuoteToOoHBridgeResult {
  if (!quote.items.length) {
    throw new Error("Quote has no line items");
  }

  assertAdminQuoteStoredAmounts(quote);

  const { company, contact } = parseStoredClientName(quote.clientName);
  const clientDisplay = contact || quote.clientName.trim();
  const email = quote.clientEmail?.trim();
  if (!email) {
    throw new Error("CLIENT_EMAIL_REQUIRED");
  }

  const { startDate, endDate, periodLabel, periodDays } =
    parsePeriodFromItems(quote.items);
  const locale = quote.isKo ? "ko" : "en";
  const mediaSelections = buildMediaSelections(quote.items);
  const mediaIds = [
    ...new Set(
      quote.items
        .map((it) => it.mediaId?.trim() ?? "")
        .filter((id) => id && !id.startsWith("custom-")),
    ),
  ];

  const totalAmountManwon = Math.max(1, wonToManwon(quote.total));
  assertAmountBridgeConsistent(quote.total, totalAmountManwon);

  const period =
    startDate && endDate
      ? periodLabelForDays(periodDays, locale)
      : periodLabel;

  const quoteBreakdown = buildQuoteBreakdown(quote, periodDays);

  const data: Prisma.OoHQuoteCreateInput = {
    status: OoHQuoteStatus.draft,
    clientName: clientDisplay,
    clientEmail: email,
    clientPhone: quote.clientPhone?.trim() || null,
    clientCompany: company.trim() || null,
    mediaIds,
    totalAmount: totalAmountManwon,
    period,
    periodKey: inferPeriodKey(periodDays),
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    validUntil: quote.validUntil,
    discountRate: quoteBreakdown.discountRate,
    locale,
    pdfTemplate: "premium",
    quoteBreakdown,
    mediaSelections: mediaSelections.length > 0 ? mediaSelections : undefined,
    sourceAdminQuote: { connect: { id: quote.id } },
    adminNote: `[Admin 견적→계약] ${quote.quoteNumber}`,
  };

  return { totalAmountManwon, data };
}

/** UI 확인 모달용 요약 */
export function summarizeAdminQuoteBridge(
  quote: Quote & { items: QuoteItem[] },
): {
  quoteNumber: string;
  clientLabel: string;
  periodLabel: string;
  lineCount: number;
  totalWon: number;
  totalManwon: number;
} {
  const { company, contact } = parseStoredClientName(quote.clientName);
  const clientLabel = [company, contact].filter(Boolean).join(" · ");
  const { periodLabel } = parsePeriodFromItems(quote.items);
  const totalManwon = wonToManwon(quote.total);
  return {
    quoteNumber: quote.quoteNumber,
    clientLabel,
    periodLabel,
    lineCount: quote.items.length,
    totalWon: quote.total,
    totalManwon,
  };
}
