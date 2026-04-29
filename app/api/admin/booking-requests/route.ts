/**
 * 어드민이 검토해야 할 예약 신청 목록.
 *
 * GET /api/admin/booking-requests?status=requested|all
 *   - status=requested (기본): 광고주 자가 신청 중 운영자 검토 대기건
 *   - status=all: 신청 이력 전체 (status 무관)
 *
 * 광고주 자가 신청 식별: requesterEmail IS NOT NULL
 *   (어드민이 직접 만든 booking 은 requester* 필드가 비어있음)
 */

import { NextRequest } from "next/server";
import { MediaBookingStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? "requested";

  const db = getPrisma();
  const rows = await db.mediaBooking.findMany({
    where: {
      // 광고주 자가 신청건만 (어드민 직접 생성건은 requesterEmail 비어있음)
      requesterEmail: { not: null },
      ...(statusFilter === "all"
        ? {}
        : { status: MediaBookingStatus.requested }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      media: { select: { id: true, name: true, location: true } },
    },
  });

  return json({
    items: rows.map((b) => ({
      id: b.id,
      mediaId: b.mediaId,
      mediaName: b.media?.name ?? "",
      mediaLocation: b.media?.location ?? "",
      status: b.status,
      title: b.title,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      requesterName: b.requesterName,
      requesterEmail: b.requesterEmail,
      requesterPhone: b.requesterPhone,
      budgetWon: b.budgetWon,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      decidedAt: b.decidedAt?.toISOString() ?? null,
    })),
  });
}
