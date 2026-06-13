import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  runHealthChecks,
  saveHealthResult,
  getLastHealthResult,
} from "@/lib/health-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveBase(request: NextRequest): string {
  const env =
    process.env.HEALTH_CHECK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return request.nextUrl.origin;
}

/** 마지막 점검 결과 조회 */
export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  return json({ result: await getLastHealthResult() });
}

/** 지금 점검 실행 */
export async function POST(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  const result = await runHealthChecks(resolveBase(request));
  await saveHealthResult(result);
  return json({ result });
}
