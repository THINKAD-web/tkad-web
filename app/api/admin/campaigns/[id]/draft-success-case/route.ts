import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  // CURSOR_RULES.md: AI 자동 생성 절대 금지
  return json(
    {
      error:
        "AI 기반 성공사례 초안 생성은 비활성화되어 있습니다. (CURSOR_RULES: AI 자동 생성 금지)",
    },
    410,
  );

  const db = getPrisma();
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return json({ error: "Not found" }, 404);

  try {
    // unreachable
    await Promise.resolve();
    const sc = await db.successCase.findUnique({ where: { campaignId: id } });
    return json({ ok: true, successCaseId: sc?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[draft-success-case]", e);
    return json({ error: msg }, 500);
  }
}
