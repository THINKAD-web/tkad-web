import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runCaseSeedBatch } from "@/lib/content-auto/seed-cases-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — Claude로 성공 사례 5건 생성 후 발행 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const out = await runCaseSeedBatch();
    return json(
      {
        success: true,
        message: "Success cases seed complete",
        ...out,
      },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/seed/cases]", msg);
    return json({ error: msg }, 500);
  }
}
