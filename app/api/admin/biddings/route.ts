import { NextRequest } from "next/server";
import { json, assertAdmin, adminDbQueryFailed } from "@/lib/admin-guard";
import { listOpenBidsForAdmin, daysUntilDeadline } from "@/lib/open-bid-service";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) return json({ error: "No DB" }, 503);

  try {
    const rows = await listOpenBidsForAdmin();
    return json({
      items: rows.map((r) => ({
        id: r.id,
        mode: r.mode,
        status: r.status,
        summaryKo: r.summaryKo,
        regionLabel: r.regionLabel,
        industryAnonymized: r.industryAnonymized,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        periodLabel: r.periodLabel,
        deadlineAt: r.deadlineAt.toISOString(),
        daysLeft: daysUntilDeadline(r.deadlineAt),
        bidCount: r._count.bids,
        submittedCount: r.bids.length,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
