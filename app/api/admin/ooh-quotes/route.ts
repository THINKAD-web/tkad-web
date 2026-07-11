import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";

export const dynamic = "force-dynamic";

const STATUSES = new Set(Object.values(OoHQuoteStatus));
/** P2: pseudo-filter — not an OoHQuoteStatus enum value */
const REVISION_REQUESTED_FILTER = "revision_requested";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status")?.trim() ?? "";
  const take = Math.min(Number(searchParams.get("take") ?? 100) || 100, 200);

  const db = getPrisma();
  const where =
    statusRaw === REVISION_REQUESTED_FILTER
      ? { revisionMessage: { not: null } }
      : statusRaw && statusRaw !== "all" && STATUSES.has(statusRaw as OoHQuoteStatus)
        ? { status: statusRaw as OoHQuoteStatus }
        : {};

  const rows = await db.ooHQuote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      oohContract: { select: { status: true } },
      sourceAdminQuote: { select: { id: true, quoteNumber: true } },
    },
  });

  return json({
    quotes: rows.map((r: (typeof rows)[number]) => ({
      ...serializeOoHQuotePublic(r, r.oohContract),
      clientEmail: r.clientEmail,
      clientPhone: r.clientPhone,
      adminNote: r.adminNote,
      quotePdfSentAt: r.quotePdfSentAt?.toISOString() ?? null,
      paymentAmount: r.paymentAmount,
      cancelReason: r.cancelReason,
      revisionMessage: r.revisionMessage,
      revisionRequestedAt: r.revisionRequestedAt?.toISOString() ?? null,
      campaignId: r.campaignId,
      updatedAt: r.updatedAt.toISOString(),
      sourceAdminQuoteId: r.sourceAdminQuoteId,
      sourceAdminQuoteNumber: r.sourceAdminQuote?.quoteNumber ?? null,
    })),
  });
}
