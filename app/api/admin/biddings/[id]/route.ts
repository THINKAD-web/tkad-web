import { NextRequest } from "next/server";
import { json, assertAdmin, adminDbQueryFailed } from "@/lib/admin-guard";
import {
  approveOwnerBid,
  daysUntilDeadline,
  getOpenBidDetail,
  selectOwnerBid,
} from "@/lib/open-bid-service";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) return json({ error: "No DB" }, 503);

  const { id } = await params;
  try {
    const detail = await getOpenBidDetail(id);
    if (!detail) return json({ error: "Not found" }, 404);
    return json({
      openBid: {
        ...detail,
        deadlineAt: detail.deadlineAt.toISOString(),
        daysLeft: daysUntilDeadline(detail.deadlineAt),
        createdAt: detail.createdAt.toISOString(),
        updatedAt: detail.updatedAt.toISOString(),
        bids: detail.bids.map((b) => ({
          id: b.id,
          status: b.status,
          priceAmount: b.priceAmount,
          benefits: b.benefits,
          message: b.message,
          submittedAt: b.submittedAt?.toISOString() ?? null,
          media: b.media,
          owner: {
            id: b.ownerUser.id,
            name: b.ownerUser.name,
            email: b.ownerUser.email,
            tier: b.ownerUser.mediaOwnerStats?.tier ?? "BRONZE",
            avgRating: b.ownerUser.mediaOwnerStats?.avgRating ?? null,
            reviewCount: b.ownerUser.mediaOwnerStats?.reviewCount ?? 0,
            avgResponseMinutes: b.ownerUser.mediaOwnerStats?.avgResponseMinutes ?? null,
          },
        })),
      },
    });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) return json({ error: "No DB" }, 503);

  const { id } = await params;
  let body: { action?: string; bidId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    if (body.action === "approve" && body.bidId) {
      const ok = await approveOwnerBid(body.bidId);
      return json({ ok });
    }
    if (body.action === "select" && body.bidId) {
      const result = await selectOwnerBid(id, body.bidId);
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ ok: true });
    }
    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
