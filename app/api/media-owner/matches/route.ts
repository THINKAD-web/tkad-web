import { apiOk, apiError } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { getOwnerOpenBids } from "@/lib/media-owner-match";
import { daysUntilDeadline } from "@/lib/open-bid-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const rows = await getOwnerOpenBids(auth.user.id);
  const items = rows.map((b) => ({
    id: b.id,
    status: b.status,
    media: b.media,
    openBid: {
      id: b.openBidRequest.id,
      mode: b.openBidRequest.mode,
      status: b.openBidRequest.status,
      summaryKo: b.openBidRequest.summaryKo,
      regionLabel: b.openBidRequest.regionLabel,
      budgetMin: b.openBidRequest.budgetMin,
      budgetMax: b.openBidRequest.budgetMax,
      periodLabel: b.openBidRequest.periodLabel,
      industryAnonymized: b.openBidRequest.industryAnonymized,
      deadlineAt: b.openBidRequest.deadlineAt.toISOString(),
      daysLeft: daysUntilDeadline(b.openBidRequest.deadlineAt),
    },
    priceAmount: b.priceAmount,
    submittedAt: b.submittedAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
  }));

  return apiOk({ items });
}
