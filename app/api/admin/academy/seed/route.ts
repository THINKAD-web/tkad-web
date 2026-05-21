import { NextRequest } from "next/server";
import { runAcademyLessonSeedPipeline } from "@/lib/content-auto/seed-academy-lessons";
import { assertAdminDb, json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — 아카데미 레슨 3건 시드. Body: `{ "publish": true }` */
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
    const out = await runAcademyLessonSeedPipeline({ publish });
    return json(
      { success: true, publish, ...out },
      out.errors > 0 ? 207 : 201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/academy/seed]", msg);
    return json({ error: msg }, 500);
  }
}
