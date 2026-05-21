import { apiError, apiOk } from "@/lib/api-response";
import { requireMediaOwner, getOwnedMediaIds } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import { formatManWon } from "@/lib/media-price-transparency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const mediaIds = await getOwnedMediaIds(auth.user.id);
  if (mediaIds.length === 0) return apiOk({ items: [] });

  const db = getPrisma();
  const rows = await db.priceNegotiationRequest.findMany({
    where: {
      mediaId: { in: mediaIds },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      media: { select: { id: true, name: true, price: true } },
    },
  });

  return apiOk({
    items: rows.map((r) => ({
      id: r.id,
      mediaId: r.mediaId,
      mediaName: r.media.name,
      listPriceWon: r.media.price,
      proposedPriceWon: r.proposedPriceWon,
      proposedLabel: formatManWon(r.proposedPriceWon, "ko"),
      listLabel: formatManWon(r.media.price, "ko"),
      companyName: r.companyName,
      message: r.message,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
