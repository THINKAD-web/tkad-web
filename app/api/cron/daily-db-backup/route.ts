import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runDailyOpsBackup } from "@/lib/ops-backup";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매일 00:00 KST (15:00 UTC) — 논리 스냅샷 + Neon PITR 보완 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  const result = await runDailyOpsBackup();
  return json(result);
}
