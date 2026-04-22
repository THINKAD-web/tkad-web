import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const quote = await prisma.ooHQuote.findUnique({ where: { id } });
    if (!quote) {
      return apiError("NOT_FOUND", 404, {
        message: "제안서를 찾을 수 없습니다.",
      });
    }

    const catalog = await fetchPublicMediaCatalog();
    const medias = catalog
      .filter((m) => quote.mediaIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        location: m.location,
        region: m.region,
        type: m.type,
        price: catalogPriceFieldToWon(m.price ?? 0),
        pricePeriod: m.pricePeriod ?? "month",
        image: m.sampleImages?.[0] ?? null,
        visibilityScore: m.visibilityScore ?? 0,
        dailyFootTraffic: m.dailyFootTraffic ?? null,
        impressions: m.impressions ?? null,
      }));

    return apiOk({
      id: quote.id,
      status: quote.status,
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
      medias,
    });
  } catch (e) {
    return apiServerError(e, "quote/[id]/detail");
  }
}
