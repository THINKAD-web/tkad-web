import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runAcademySeedBatch } from "@/lib/content-auto/seed-academy-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — Claude로 아카데미 레슨 5건 생성 후 발행 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const out = await runAcademySeedBatch();
    return json(
      {
        success: true,
        message: "Academy lessons seed complete",
        ...out,
      },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/seed/academy]", msg);
    return json({ error: msg }, 500);
  }
}
