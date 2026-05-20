import { json } from "@/lib/admin-guard";
import { refreshAllMediaFusion } from "@/lib/data-fusion";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매월 1일 — 모든 매체 data-fusion 캐시 갱신 */
export async function GET(request: Request) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured()) return json({ error: "No DB" }, 503);

  const count = await refreshAllMediaFusion(500);
  return json({ ok: true, refreshed: count });
}
