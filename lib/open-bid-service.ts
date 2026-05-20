import type { MediaOwnerBidStatus, OpenBidStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";
import {
  applyFirstBidSuccessIncentive,
  recordContractWon,
} from "@/lib/media-owner-tier";
import { createNotification } from "@/lib/notifications";
import { siteUrl } from "@/lib/seo";

export async function submitOwnerBidQuote(input: {
  bidId: string;
  ownerUserId: string;
  priceAmount: number;
  benefits?: string;
  message?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) return { ok: false, error: "no_db" };
  const db = getPrisma();

  const bid = await db.mediaOwnerBid.findFirst({
    where: { id: input.bidId, ownerUserId: input.ownerUserId },
    include: { openBidRequest: true },
  });
  if (!bid) return { ok: false, error: "not_found" };
  if (bid.openBidRequest.status !== "OPEN") {
    return { ok: false, error: "closed" };
  }
  if (!["NOTIFY", "INTERESTED", "SUBMITTED"].includes(bid.status)) {
    return { ok: false, error: "invalid_status" };
  }

  await db.mediaOwnerBid.update({
    where: { id: bid.id },
    data: {
      status: "SUBMITTED",
      priceAmount: input.priceAmount,
      benefits: input.benefits?.trim() || null,
      message: input.message?.trim() || null,
      submittedAt: new Date(),
    },
  });

  await db.openBidRequest.update({
    where: { id: bid.openBidRequestId },
    data: { status: "REVIEWING" },
  });

  return { ok: true };
}

export async function approveOwnerBid(bidId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const db = getPrisma();
  try {
    await db.mediaOwnerBid.update({
      where: { id: bidId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    return true;
  } catch (e) {
    if (isMissingContentTableError(e)) return false;
    throw e;
  }
}

export async function selectOwnerBid(
  openBidId: string,
  bidId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) return { ok: false, error: "no_db" };
  const db = getPrisma();

  const bid = await db.mediaOwnerBid.findFirst({
    where: { id: bidId, openBidRequestId: openBidId },
    include: { openBidRequest: true, media: true },
  });
  if (!bid) return { ok: false, error: "not_found" };

  await db.$transaction([
    db.openBidRequest.update({
      where: { id: openBidId },
      data: {
        status: "SELECTED" satisfies OpenBidStatus,
        selectedBidId: bidId,
      },
    }),
    db.mediaOwnerBid.update({
      where: { id: bidId },
      data: { status: "SELECTED" satisfies MediaOwnerBidStatus },
    }),
    db.mediaOwnerBid.updateMany({
      where: {
        openBidRequestId: openBidId,
        id: { not: bidId },
        status: { in: ["SUBMITTED", "APPROVED", "INTERESTED", "NOTIFY"] },
      },
      data: { status: "REJECTED" },
    }),
  ]);

  if (bid.priceAmount) {
    await recordContractWon(bid.ownerUserId, bid.priceAmount);
  }
  await applyFirstBidSuccessIncentive(bid.ownerUserId);

  await createNotification({
    userId: bid.ownerUserId,
    type: "BID_SELECTED",
    title: "비딩이 선택되었습니다",
    body: `${bid.media.name} 제안이 광고주에게 전달·선택되었습니다.`,
    link: `${siteUrl}/ko/media-owner/matches/${bid.id}`,
    dedupeKey: `bid-selected:${bidId}`,
  });

  return { ok: true };
}

export async function listOpenBidsForAdmin() {
  const db = getPrisma();
  return db.openBidRequest.findMany({
    include: {
      _count: { select: { bids: true } },
      bids: {
        where: { status: { in: ["SUBMITTED", "APPROVED"] } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getOpenBidDetail(openBidId: string) {
  const db = getPrisma();
  return db.openBidRequest.findUnique({
    where: { id: openBidId },
    include: {
      contactInquiry: {
        select: { id: true, company: true, name: true, phone: true, email: true },
      },
      bids: {
        include: {
          media: { select: { id: true, name: true, type: true, region: true } },
          ownerUser: {
            select: {
              id: true,
              name: true,
              email: true,
              mediaOwnerStats: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
      },
    },
  });
}

export function daysUntilDeadline(deadlineAt: Date): number {
  const ms = deadlineAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
