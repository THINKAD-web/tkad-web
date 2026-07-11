import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  parseQuoteMediaSelections,
  selectionsByMediaId,
} from "@/lib/quote-media-selections";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const quote = await prisma.ooHQuote.findUnique({
      where: { id },
      include: { oohContract: true },
    });
    if (!quote) {
      return apiError("NOT_FOUND", 404, {
        message: "제안서를 찾을 수 없습니다.",
      });
    }

    const catalog = await fetchPublicMediaCatalog();
    const selectionMap = selectionsByMediaId(
      parseQuoteMediaSelections(quote.mediaSelections),
    );
    const medias = catalog
      .filter((m) => quote.mediaIds.includes(m.id))
      .map((m) => {
        const snap = selectionMap.get(m.id);
        const basePrice = catalogPriceFieldToWon(m.price ?? 0);
        return {
          id: m.id,
          name: snap?.optionLabel ? `${m.name} (${snap.optionLabel})` : m.name,
          location: m.location,
          region: m.region,
          type: m.type,
          price: snap?.optionPriceWon ?? basePrice,
          lineTotalWon: snap?.lineTotalWon ?? null,
          priceOptionIndex: snap?.priceOptionIndex ?? null,
          optionLabel: snap?.optionLabel ?? null,
          pricePeriod: m.pricePeriod ?? "month",
          image: m.sampleImages?.[0] ?? null,
          visibilityScore: m.visibilityScore ?? 0,
          dailyFootTraffic: m.dailyFootTraffic ?? null,
          impressions: m.impressions ?? null,
        };
      });

    const contract = quote.oohContract;
    const contractSigned =
      contract?.status === OohContractStatus.signed ||
      contract?.status === OohContractStatus.confirmed;
    const canSignContract =
      quote.status === OoHQuoteStatus.booking_confirmed &&
      (!contract || contract.status === OohContractStatus.pending);

    return apiOk({
      id: quote.id,
      status: quote.status,
      contractStatus: contract?.status ?? null,
      contractSigned,
      canSignContract,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientCompany: quote.clientCompany,
      period: quote.period,
      startDate: quote.startDate,
      endDate: quote.endDate,
      totalAmount: quote.totalAmount,
      budgetMin: quote.budgetMin,
      budgetMax: quote.budgetMax,
      createdAt: quote.createdAt,
      revisionMessage: quote.revisionMessage,
      revisionRequestedAt: quote.revisionRequestedAt?.toISOString() ?? null,
      mediaSelections: parseQuoteMediaSelections(quote.mediaSelections) ?? null,
      medias,
    });
  } catch (e) {
    return apiServerError(e, "quote/[id]/detail");
  }
}
