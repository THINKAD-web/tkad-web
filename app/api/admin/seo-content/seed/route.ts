import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runFaqSeedPipeline } from "@/lib/seo-content/seed-faq-pipeline";
import { runSeoGuideSeedPipeline } from "@/lib/seo-content/seed-seo-guides";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST — SEO FAQ 30건 + 가이드 5건 시드 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let faq = true;
  let guides = true;
  let useClaude = true;
  let publish = true;
  try {
    const body = (await request.json()) as {
      faq?: boolean;
      guides?: boolean;
      useClaude?: boolean;
      publish?: boolean;
    };
    if (body.faq === false) faq = false;
    if (body.guides === false) guides = false;
    if (body.useClaude === false) useClaude = false;
    if (body.publish === false) publish = false;
  } catch {
    /* defaults */
  }

  try {
    const result: Record<string, unknown> = {};
    if (faq) {
      result.faq = await runFaqSeedPipeline({ useClaude });
    }
    if (guides) {
      result.guides = await runSeoGuideSeedPipeline({ publish });
    }
    return json({ success: true, ...result }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    return json({ error: msg }, 500);
  }
}
