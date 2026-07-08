import type { OoHQuote, PrismaClient } from "@prisma/client";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import { isCustomBridgeMediaId } from "@/lib/admin-quote-to-ooh";
import { OohQuoteRecalcError } from "@/lib/ooh-quote-recalc-error";
import {
  calculateQuoteFromMediaIds,
  periodLabelForDays,
  type QuoteBreakdown,
  type QuoteLineItem,
} from "@/lib/quote-calculator";
import {
  parseQuoteMediaSelections,
} from "@/lib/quote-media-selections";

export function parseStoredQuoteBreakdown(
  raw: unknown,
): (QuoteBreakdown & Record<string, unknown>) | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as QuoteBreakdown;
  if (!Array.isArray(o.lines)) return null;
  return o as QuoteBreakdown & Record<string, unknown>;
}

/** DB 재계산 대상 mediaIds — quote.mediaIds 우선, 없으면 breakdown 비-custom 라인 */
export function resolveDbMediaIdsForRecalc(
  mediaIds: string[],
  breakdown: QuoteBreakdown | null,
): string[] {
  const fromQuote = [
    ...new Set(mediaIds.map((id) => id.trim()).filter(Boolean)),
  ].filter((id) => !isCustomBridgeMediaId(id));
  if (fromQuote.length > 0) return fromQuote;

  if (!breakdown) return [];
  return [
    ...new Set(
      breakdown.lines
        .map((line) => line.mediaId?.trim() ?? "")
        .filter((id) => id && !isCustomBridgeMediaId(id)),
    ),
  ];
}

export function customLinesFromBreakdown(
  breakdown: QuoteBreakdown | null,
): QuoteLineItem[] {
  if (!breakdown) return [];
  return breakdown.lines.filter((line) =>
    isCustomBridgeMediaId(line.mediaId ?? ""),
  );
}

export function mergeRecalcLines(
  storedBreakdown: QuoteBreakdown,
  calculatedLines: QuoteLineItem[],
): QuoteLineItem[] {
  const calculatedByMediaId = new Map(
    calculatedLines.map((line) => [line.mediaId, line]),
  );

  return storedBreakdown.lines.map((line) => {
    if (isCustomBridgeMediaId(line.mediaId ?? "")) return line;
    return calculatedByMediaId.get(line.mediaId) ?? line;
  });
}

function buildBreakdownTotals(
  lines: QuoteLineItem[],
  discountRate: number,
  issuedAt: Date,
  validUntil: Date,
): QuoteBreakdown {
  const totals = computeAdminQuoteTotals({
    lineWons: lines.map((line) => line.lineSupplyWon),
    discountPercent: discountRate,
    discountWon: 0,
    vatIncluded: false,
  });

  return {
    lines,
    subtotalWon: totals.linesSubtotalWon,
    discountRate,
    discountWon: totals.discountTotalWon,
    supplyWon: totals.supplyWon,
    vatWon: totals.vatWon,
    totalWon: totals.totalWon,
    validUntil: validUntil.toISOString(),
    issuedAt: issuedAt.toISOString(),
  };
}

function preserveBridgeBreakdownMeta(
  stored: (QuoteBreakdown & Record<string, unknown>) | null,
  next: QuoteBreakdown,
): QuoteBreakdown & Record<string, unknown> {
  if (!stored) return next;
  const merged: QuoteBreakdown & Record<string, unknown> = { ...next };
  for (const key of ["adminQuoteId", "adminQuoteNumber", "customLineIds"]) {
    const value = stored[key];
    if (value != null) merged[key] = value;
  }
  return merged;
}

export async function syncOoHQuoteBreakdown(
  db: PrismaClient,
  quote: Pick<
    OoHQuote,
    | "id"
    | "mediaIds"
    | "startDate"
    | "endDate"
    | "discountRate"
    | "locale"
    | "period"
    | "periodKey"
    | "quoteBreakdown"
    | "mediaSelections"
  >,
): Promise<OoHQuote> {
  const storedBreakdown = parseStoredQuoteBreakdown(quote.quoteBreakdown);
  const customLines = customLinesFromBreakdown(storedBreakdown);
  const dbMediaIds = resolveDbMediaIdsForRecalc(quote.mediaIds, storedBreakdown);

  if (dbMediaIds.length === 0) {
    if (customLines.length > 0 || (storedBreakdown?.lines.length ?? 0) > 0) {
      throw new OohQuoteRecalcError(
        "recalc_custom_only",
        "This quote has custom line items only; recalculation is not applicable.",
      );
    }
    throw new OohQuoteRecalcError(
      "recalc_no_media",
      "No media items available for recalculation.",
    );
  }

  const start = quote.startDate ?? new Date();
  const end =
    quote.endDate ??
    (() => {
      const d = new Date(start);
      d.setDate(d.getDate() + 29);
      return d;
    })();

  const mediaSelections = parseQuoteMediaSelections(quote.mediaSelections);
  const mediaPriceOptionIndex =
    mediaSelections && mediaSelections.length > 0
      ? Object.fromEntries(
          mediaSelections.map((sel) => [sel.mediaId, sel.priceOptionIndex]),
        )
      : undefined;

  const calculated = await calculateQuoteFromMediaIds(db, {
    mediaIds: dbMediaIds,
    startDate: start,
    endDate: end,
    discountRate: quote.discountRate ?? 0,
    periodKey: quote.periodKey ?? undefined,
    mediaPriceOptionIndex,
    mediaSelections,
  });

  const locale = quote.locale === "en" ? "en" : "ko";
  const discountRate =
    quote.discountRate ?? storedBreakdown?.discountRate ?? calculated.discountRate;

  if (customLines.length === 0) {
    return db.ooHQuote.update({
      where: { id: quote.id },
      data: {
        totalAmount: calculated.totalAmountManwon,
        period: periodLabelForDays(calculated.periodDays, locale),
        startDate: calculated.startDate,
        endDate: calculated.endDate,
        validUntil: calculated.validUntilDate,
        quoteBreakdown: {
          lines: calculated.lines,
          subtotalWon: calculated.subtotalWon,
          discountRate: calculated.discountRate,
          discountWon: calculated.discountWon,
          supplyWon: calculated.supplyWon,
          vatWon: calculated.vatWon,
          totalWon: calculated.totalWon,
          validUntil: calculated.validUntil,
          issuedAt: calculated.issuedAt,
        },
      },
    });
  }

  const mergedLines = storedBreakdown
    ? mergeRecalcLines(storedBreakdown, calculated.lines)
    : [...calculated.lines, ...customLines];

  const issuedAt = new Date();
  const validUntil = calculated.validUntilDate;
  const mergedBreakdown = buildBreakdownTotals(
    mergedLines,
    discountRate,
    issuedAt,
    validUntil,
  );
  const quoteBreakdown = preserveBridgeBreakdownMeta(
    storedBreakdown,
    mergedBreakdown,
  );

  return db.ooHQuote.update({
    where: { id: quote.id },
    data: {
      totalAmount: Math.max(1, Math.round(mergedBreakdown.totalWon / 10_000)),
      period: periodLabelForDays(calculated.periodDays, locale),
      startDate: calculated.startDate,
      endDate: calculated.endDate,
      validUntil,
      quoteBreakdown,
    },
  });
}
