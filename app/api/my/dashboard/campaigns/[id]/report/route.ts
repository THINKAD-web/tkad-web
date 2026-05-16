import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiServerError } from "@/lib/api-response";
import { assertCampaignAccess } from "@/lib/advertiser-campaign-access";
import { buildCampaignCompletionReportPdfBuffer } from "@/lib/campaign-completion-report";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    const { id } = await params;
    const db = getPrisma();
    const allowed = await assertCampaignAccess(
      db,
      id,
      user.id,
      user.email,
    );
    if (!allowed) {
      return apiError("NOT_FOUND", 404, { message: "캠페인을 찾을 수 없습니다." });
    }

    const campaign = await db.campaign.findUnique({
      where: { id },
      select: { name: true, clientCompany: true },
    });
    if (!campaign) {
      return apiError("NOT_FOUND", 404);
    }

    const buf = await buildCampaignCompletionReportPdfBuffer(id);
    const safe =
      (campaign.clientCompany || campaign.name)
        .replace(/[\\/:*?"<>|]/g, "")
        .slice(0, 40) || "report";
    const filename = `${safe}_THINKAD_report.pdf`;

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return apiServerError(e, "my/dashboard/campaigns/[id]/report");
  }
}
