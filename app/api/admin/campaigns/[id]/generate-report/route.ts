import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { buildCampaignCompletionReportPdfBuffer } from "@/lib/campaign-completion-report";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  try {
    const buf = await buildCampaignCompletionReportPdfBuffer(id);
    const filename = `thinkad-campaign-${id.slice(0, 8)}-completion.pdf`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not found") || msg.includes("Campaign not found")) {
      return json({ error: msg }, 404);
    }
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[generate-report]", e);
    return json({ error: msg }, 500);
  }
}
