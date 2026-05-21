import { NextRequest } from "next/server";
import { runGuideArticleSeedPipeline } from "@/lib/content-auto/seed-guide-articles";
import { assertAdminDb, json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — 광고주 가이드 3건 시드. Body: `{ "publish": true }` */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let publish = true;
  try {
    const body = (await request.json()) as { publish?: boolean };
    if (body.publish === false) publish = false;
  } catch {
    /* default */
  }

  try {
    const out = await runGuideArticleSeedPipeline({ publish });
    return json(
      { success: true, publish, ...out },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/guides/seed]", msg);
    return json({ error: msg }, 500);
  }
}
