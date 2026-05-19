import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { buildCampaignCompletionReportPdfBuffer } from "@/lib/campaign-completion-report";
import { createNotification } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * #5: "[클라이언트명]_THINKAD_옥외광고_성과보고서_YYYYMM.pdf"
 * 클라이언트명 비어있으면 "클라이언트미지정", 파일명 금지 문자 제거.
 */
function buildClientReportFilename(clientCompany: string | null | undefined): string {
  const raw = (clientCompany ?? "").trim() || "클라이언트미지정";
  const safe = raw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${safe}_THINKAD_옥외광고_성과보고서_${yyyymm}.pdf`;
}

function asciiFallbackFilename(campaignId: string): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `THINKAD-OOH-Report-${campaignId.slice(0, 8)}-${yyyymm}.pdf`;
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  try {
    const db = getPrisma();
    const buf = await buildCampaignCompletionReportPdfBuffer(id);
    await db.campaign.update({
      where: { id },
      data: { reportGeneratedAt: new Date() },
    });
    const c = await db.campaign.findUnique({
      where: { id },
      select: { clientCompany: true, name: true, ownerUserId: true },
    });
    if (c?.ownerUserId) {
      void createNotification({
        userId: c.ownerUserId,
        type: "REPORT_READY",
        title: "성과 보고서가 준비되었습니다",
        body: c.name,
        link: `/dashboard/campaigns/${id}`,
        dedupeKey: `report_ready:${id}`,
      });
    }
    const filename = buildClientReportFilename(c?.clientCompany);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFallbackFilename(id)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
