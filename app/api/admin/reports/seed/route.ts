import { NextRequest } from "next/server";
import { runTrendReportSeedPipeline } from "@/lib/content-auto/seed-trend-reports";
import { assertAdminDb, json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST — 트렌드 리포트 시드 5건 (Claude + Tavily).
 * Body: `{ "publish": true }` (기본 true — 즉시 발행)
 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let publish = true;
  try {
    const body = (await request.json()) as { publish?: boolean };
    if (body.publish === false) publish = false;
  } catch {
    /* default publish */
  }

  try {
    const out = await runTrendReportSeedPipeline({ publish });
    return json(
      {
        success: true,
        publish,
        ...out,
        message: publish
          ? "Trend reports generated and published"
          : "Trend report drafts created",
      },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/reports/seed]", msg);
    return json({ error: msg }, 500);
  }
}
