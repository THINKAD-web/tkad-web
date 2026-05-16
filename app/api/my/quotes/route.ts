import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IN_PROGRESS_STATUSES = new Set([
  "booking_requested",
  "booking_confirmed",
  "invoice_sent",
  "payment_confirmed",
  "contract_confirmed",
]);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const rows = await prisma.ooHQuote.findMany({
      where: { clientEmail: user.email },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        clientName: true,
        clientCompany: true,
        period: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        mediaIds: true,
        createdAt: true,
        revisionRequestedAt: true,
        revisionResolvedAt: true,
        contractConfirmedAt: true,
        oohContract: {
          select: { status: true, signedAt: true },
        },
      },
    });

    const items = rows.map((q) => ({
      id: q.id,
      status: q.status,
      clientName: q.clientName,
      clientCompany: q.clientCompany,
      period: q.period,
      startDate: q.startDate,
      endDate: q.endDate,
      totalAmount: q.totalAmount,
      mediaCount: q.mediaIds.length,
      createdAt: q.createdAt,
      isInProgress: IN_PROGRESS_STATUSES.has(q.status),
      /** 광고주가 가장 최근 수정 요청을 한 시각 (UI 에 "수정 요청 진행 중" 배지용) */
      revisionRequestedAt: q.revisionRequestedAt,
      revisionResolvedAt: q.revisionResolvedAt,
      /** 계약 단계 — 서명/확정 시각이 있으면 그 시각을 활용해 진행률을 그리기 */
      contractSignedAt: q.oohContract?.signedAt ?? null,
      contractStatus: q.oohContract?.status ?? null,
      contractConfirmedAt: q.contractConfirmedAt,
    }));

    const inProgress = items.filter((i) => i.isInProgress);

    return apiOk({ items, inProgress, total: items.length });
  } catch (e) {
    return apiServerError(e, "my/quotes");
  }
}
