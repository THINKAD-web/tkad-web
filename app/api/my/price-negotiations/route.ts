import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { formatManWon } from "@/lib/media-price-transparency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    if (!isDatabaseConfigured()) return apiOk({ items: [] });

    const db = getPrisma();
    const rows = await db.priceNegotiationRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        media: { select: { id: true, name: true } },
        oohQuote: { select: { id: true, status: true } },
      },
    });

    const locale = "ko";
    return apiOk({
      items: rows.map((r) => ({
        id: r.id,
        mediaId: r.mediaId,
        mediaName: r.media.name,
        status: r.status,
        proposedLabel: formatManWon(r.proposedPriceWon, locale),
        expiresAt: r.expiresAt.toISOString(),
        respondedAt: r.respondedAt?.toISOString() ?? null,
        quoteId: r.oohQuote?.id ?? null,
        quoteStatus: r.oohQuote?.status ?? null,
        contractUrl: r.oohQuote?.id
          ? `/${locale}/quote/${r.oohQuote.id}/contract`
          : null,
        previewUrl: r.oohQuote?.id
          ? `/${locale}/quote/${r.oohQuote.id}/preview`
          : null,
      })),
    });
  } catch (e) {
    return apiServerError(e, "my/price-negotiations");
  }
}
