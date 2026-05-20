import type { OoHQuote, PrismaClient } from "@prisma/client";
import {
  calculateQuoteFromMediaIds,
  periodLabelForDays,
} from "@/lib/quote-calculator";

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
  >,
): Promise<OoHQuote> {
  const start = quote.startDate ?? new Date();
  const end =
    quote.endDate ??
    (() => {
      const d = new Date(start);
      d.setDate(d.getDate() + 29);
      return d;
    })();

  const calculated = await calculateQuoteFromMediaIds(db, {
    mediaIds: quote.mediaIds,
    startDate: start,
    endDate: end,
    discountRate: quote.discountRate ?? 0,
  });

  const locale = quote.locale === "en" ? "en" : "ko";

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
