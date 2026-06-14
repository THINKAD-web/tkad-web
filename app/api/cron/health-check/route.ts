/**
 * 자동 기능 점검 — 매일 아침 9시(KST) Vercel Cron.
 * 자기 오리진 기준으로 주요 페이지/API 생존을 확인하고 결과를 저장.
 * 실패가 있으면 내부 알림(Slack/웹훅)으로 통보.
 * 스케줄: vercel.json `0 0 * * *` (UTC 00:00 = KST 09:00)
 */
import type { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { isAdminRequestAuthorized } from "@/lib/require-admin-request";
import { runHealthChecks, saveHealthResult } from "@/lib/health-check";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }
  // 어드민이 수동 실행하는 경우도 허용
  return isAdminRequestAuthorized(request);
}

function resolveBase(request: NextRequest): string {
  const env =
    process.env.SMOKE_BASE_URL?.trim() ||
    process.env.HEALTH_CHECK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);

  const base = resolveBase(request);
  const result = await runHealthChecks(base);
  await saveHealthResult(result);

  if (result.fail > 0) {
    const failed = result.rows.filter((r) => !r.ok);
    void postInternalAlert({
      type: "health_check_fail",
      title: `🚨 기능 점검 실패 ${result.fail}건 / 전체 ${result.total}`,
      body: failed
        .slice(0, 12)
        .map((r) => `• ${r.url} → ${r.issue ?? `HTTP ${r.status}`}`)
        .join("\n"),
      meta: { base, fail: result.fail, total: result.total },
    }).catch(() => {});
  }

  return json({
    ok: true,
    ranAt: result.ranAt,
    base: result.base,
    total: result.total,
    pass: result.pass,
    fail: result.fail,
    failed: result.rows.filter((r) => !r.ok).map((r) => ({ url: r.url, status: r.status, issue: r.issue })),
  });
}
