import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runReportSeedBatch } from "@/lib/content-auto/seed-reports-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — Claude로 트렌드 리포트 5건 생성 후 발행 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const out = await runReportSeedBatch();
    return json(
      {
        success: true,
        message: "Trend reports seed complete",
        ...out,
      },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/seed/reports]", msg);
    return json({ error: msg }, 500);
  }
}
