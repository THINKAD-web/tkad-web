import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const db = getPrisma();
  const rows = await db.booking.findMany({
    where: status && status !== "all" ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      media: { select: { id: true, name: true, location: true } },
      paymentLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return json({
    items: rows.map((b) => ({
      id: b.id,
      mediaId: b.mediaId,
      mediaName: b.media.name,
      mediaLocation: b.media.location,
      startDate: b.startDate.toISOString().slice(0, 10),
      endDate: b.endDate.toISOString().slice(0, 10),
      amount: b.amount,
      status: b.status,
      orderId: b.orderId,
      paymentId: b.paymentId,
      contactName: b.contactName,
      contactEmail: b.contactEmail,
      contactPhone: b.contactPhone,
      creativeUrl: b.creativeUrl,
      creativeType: b.creativeType,
      paidAt: b.paidAt?.toISOString() ?? null,
      executionConfirmedAt: b.executionConfirmedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      lastPayment: b.paymentLogs[0]
        ? {
            provider: b.paymentLogs[0].provider,
            status: b.paymentLogs[0].status,
            amount: b.paymentLogs[0].amount,
          }
        : null,
    })),
  });
}
