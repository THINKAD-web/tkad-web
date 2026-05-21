import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runInquirySlaEscalation } from "@/lib/inquiry-sla-escalation";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 6시간마다 — 24시간 미응답 문의 에스컬레이션 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  const result = await runInquirySlaEscalation();
  return json({ ok: true, ...result });
}
