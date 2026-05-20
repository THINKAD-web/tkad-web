import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const statusRaw =
    request.nextUrl.searchParams.get("status")?.trim() || "PENDING";
  const db = getPrisma();

  const rows = await db.mediaPriceChangeRequest.findMany({
    where:
      statusRaw === "all"
        ? {}
        : { status: statusRaw as "PENDING" | "APPROVED" | "REJECTED" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      media: { select: { id: true, name: true, price: true } },
      ownerUser: { select: { id: true, email: true, name: true, company: true } },
    },
  });

  return json({
    requests: rows.map((r) => ({
      id: r.id,
      mediaId: r.mediaId,
      mediaName: r.media.name,
      currentPrice: r.currentPrice,
      requestedPrice: r.requestedPrice,
      reason: r.reason,
      status: r.status,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt.toISOString(),
      owner: r.ownerUser,
    })),
  });
}
