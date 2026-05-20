import { apiOk, apiError } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import { daysUntilDeadline } from "@/lib/open-bid-service";
import { recordOwnerResponseTime } from "@/lib/media-owner-match";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getPrisma();
  const bid = await db.mediaOwnerBid.findFirst({
    where: { id, ownerUserId: auth.user.id },
    include: {
      openBidRequest: true,
      media: { select: { id: true, name: true, type: true, region: true, price: true } },
    },
  });
  if (!bid) return apiError("NOT_FOUND", 404);

  return apiOk({
    bid: {
      id: bid.id,
      status: bid.status,
      priceAmount: bid.priceAmount,
      benefits: bid.benefits,
      message: bid.message,
      media: bid.media,
      openBid: {
        ...bid.openBidRequest,
        deadlineAt: bid.openBidRequest.deadlineAt.toISOString(),
        daysLeft: daysUntilDeadline(bid.openBidRequest.deadlineAt),
      },
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { action?: string; priceAmount?: number; benefits?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", 400);
  }

  const db = getPrisma();
  const bid = await db.mediaOwnerBid.findFirst({
    where: { id, ownerUserId: auth.user.id },
  });
  if (!bid) return apiError("NOT_FOUND", 404);

  if (body.action === "interested") {
    if (bid.status !== "NOTIFY") {
      return apiError("INVALID_STATUS", 400, { message: "Already responded" });
    }
    const now = new Date();
    await db.mediaOwnerBid.update({
      where: { id },
      data: { status: "INTERESTED", interestedAt: now },
    });
    void recordOwnerResponseTime(auth.user.id, now, bid.notifiedAt);
    return apiOk({ status: "INTERESTED" });
  }

  if (body.action === "submit") {
    const price = Number(body.priceAmount);
    if (!Number.isFinite(price) || price <= 0) {
      return apiError("VALIDATION", 400, { message: "priceAmount required" });
    }
    const { submitOwnerBidQuote } = await import("@/lib/open-bid-service");
    const result = await submitOwnerBidQuote({
      bidId: id,
      ownerUserId: auth.user.id,
      priceAmount: Math.round(price),
      benefits: body.benefits,
      message: body.message,
    });
    if (!result.ok) {
      return apiError("FAILED", 400, { message: result.error });
    }
    return apiOk({ status: "SUBMITTED" });
  }

  return apiError("INVALID_ACTION", 400);
}
