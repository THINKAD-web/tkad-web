import { apiError, apiOk } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const db = getPrisma();
  const row = await db.mediaOwnerSettlement.findFirst({
    where: { id, ownerUserId: auth.user.id },
  });
  if (!row) return apiError("NOT_FOUND", 404);
  if (row.taxInvoiceRequestedAt) {
    return apiOk({ alreadyRequested: true });
  }

  const updated = await db.mediaOwnerSettlement.update({
    where: { id },
    data: { taxInvoiceRequestedAt: new Date() },
  });

  return apiOk({
    settlement: {
      id: updated.id,
      taxInvoiceRequestedAt: updated.taxInvoiceRequestedAt?.toISOString(),
    },
  });
}
