import { apiOk } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { listOwnerSettlements } from "@/lib/media-owner-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const settlements = await listOwnerSettlements(auth.user.id);
  return apiOk({
    settlements: settlements.map((s) => ({
      id: s.id,
      periodMonth: s.periodMonth,
      grossWon: s.grossWon,
      feeWon: s.feeWon,
      netWon: s.netWon,
      status: s.status,
      taxInvoiceRequestedAt: s.taxInvoiceRequestedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
  });
}
