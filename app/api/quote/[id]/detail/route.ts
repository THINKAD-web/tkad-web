import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const quote = await prisma.oOHQuote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND" } },
      { status: 404 },
    );
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
      price: m.price,
      pricePeriod: m.pricePeriod ?? "month",
      image: m.sampleImages?.[0] ?? null,
      visibilityScore: m.visibilityScore ?? 0,
      dailyFootTraffic: m.dailyFootTraffic ?? null,
      impressions: m.impressions ?? null,
    }));

  return NextResponse.json({
    ok: true,
    data: {
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
    },
  });
}
