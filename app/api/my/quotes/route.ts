import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  const rows = await prisma.oOHQuote.findMany({
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
    isInProgress: ["booking_requested", "booking_confirmed", "invoice_sent", "payment_confirmed", "contract_confirmed"].includes(
      q.status,
    ),
  }));

  const inProgress = items.filter((i) => i.isInProgress);

  return NextResponse.json({
    ok: true,
    data: {
      items,
      inProgress,
      total: items.length,
    },
  });
}
