import { NextRequest } from "next/server";
import { upsertDraftSuccessCaseFromCampaign } from "@/lib/auto-success-case-from-campaign";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  const db = getPrisma();
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return json({ error: "Not found" }, 404);

  try {
    await upsertDraftSuccessCaseFromCampaign(id);
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
