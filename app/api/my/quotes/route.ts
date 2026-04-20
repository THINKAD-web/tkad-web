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
    }));

    const inProgress = items.filter((i) => i.isInProgress);

    return apiOk({ items, inProgress, total: items.length });
  } catch (e) {
    return apiServerError(e, "my/quotes");
  }
}
