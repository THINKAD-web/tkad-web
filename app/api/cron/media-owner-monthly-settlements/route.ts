import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runMonthlyOwnerSettlements } from "@/lib/media-owner-settlement-batch";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매월 1일 09:00 KST — 지난달 정산서 발송 + 세금계산서 요청 기록 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "db_not_configured" }, 200);
  }
  const batch = await runMonthlyOwnerSettlements(getPrisma());
  return json({ ok: true, ...batch });
}
