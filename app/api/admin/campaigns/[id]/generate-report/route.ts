import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { generateCampaignReport } from "@/lib/campaign-report-generate";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

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

/**
 * 레거시: PDF 바이너리 직접 다운로드 (query 없음)
 * ?mode=cdn — JSON { pdfUrl, ... } (Bunny 업로드 + DB 저장)
 * ?mode=cdn&sendEmail=1 — 업로드 후 광고주 메일 발송
 */
export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const mode = request.nextUrl.searchParams.get("mode");
  const sendEmail = request.nextUrl.searchParams.get("sendEmail") === "1";

  if (mode === "cdn") {
    try {
      const result = await generateCampaignReport(id, { sendEmail });
      return json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Campaign not found")) {
        return json({ error: msg }, 404);
      }
      console.error("[generate-report cdn]", e);
      return json({ error: msg }, 500);
    }
  }

  try {
    const { buildCampaignCompletionReportPdfBuffer } = await import(
      "@/lib/campaign-completion-report"
    );
    const buf = await buildCampaignCompletionReportPdfBuffer(id);
    const db = getPrisma();
    const c = await db.campaign.findUnique({
      where: { id },
      select: { clientCompany: true },
    });
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
    console.error("[generate-report]", e);
    return json({ error: msg }, 500);
  }
}
