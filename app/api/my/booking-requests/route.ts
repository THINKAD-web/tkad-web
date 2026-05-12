/**
 * 가입 사용자 본인의 예약 신청 이력 조회.
 *
 * 매칭 정책:
 *   - requestedByUserId === me.id (가입 후 신청한 건)
 *   - 추가로 requesterEmail === me.email 도 OR 매칭 (로그인 전 익명으로 신청한 같은 이메일 건)
 *   - 최신순 50건 한도
 *
 * 응답에 광고주 본인의 데이터만 포함되므로 식별 정보 일부 OK
 * (반대로 다른 광고주의 정보는 절대 포함 X — `where` 절이 보장).
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const rows = await prisma.mediaBooking.findMany({
      where: {
        OR: [
          { requestedByUserId: user.id },
          { requesterEmail: user.email },
        ],
        // 광고주 자가 신청건만 노출 — 어드민이 직접 만든 booking 은 마이페이지에 안 띄움
        // (어드민 직접 생성건은 보통 requesterEmail 비어있음)
        requesterEmail: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        mediaId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        budgetWon: true,
        notes: true,
        createdAt: true,
        decidedAt: true,
        media: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            location: true,
            type: true,
            image: true,
          },
        },
      },
    });

    const items = rows.map((b) => ({
      id: b.id,
      status: b.status,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      budgetWon: b.budgetWon,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      decidedAt: b.decidedAt?.toISOString() ?? null,
      media: {
        id: b.media.id,
        name: b.media.name,
        nameEn: b.media.nameEn,
        location: b.media.location,
        type: b.media.type,
        image: b.media.image,
      },
    }));

    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "my.booking-requests.GET");
  }
}
