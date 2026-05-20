import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const status = request.nextUrl.searchParams.get("status")?.trim();
  const db = getPrisma();

  const rows = await db.mediaOwnerSettlement.findMany({
    where:
      status && status !== "all"
        ? { status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" }
        : {},
    orderBy: [{ periodMonth: "desc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      ownerUser: {
        select: { id: true, email: true, name: true, company: true, phone: true },
      },
    },
  });

  return json({
    settlements: rows.map((s) => ({
      id: s.id,
      periodMonth: s.periodMonth,
      grossWon: s.grossWon,
      feeWon: s.feeWon,
      netWon: s.netWon,
      status: s.status,
      taxInvoiceRequestedAt: s.taxInvoiceRequestedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      notes: s.notes,
      owner: s.ownerUser,
    })),
  });
}
