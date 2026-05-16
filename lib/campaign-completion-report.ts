import { campaignCompletionPdfToBuffer } from "@/lib/build-campaign-completion-pdf";
import {
  loadCampaignReportPdfParams,
  type BuildCampaignReportOptions,
} from "@/lib/campaign-report-build-params";

/**
 * 캠페인 데이터 → 완료 보고서 PDF 바이너리.
 */
export async function buildCampaignCompletionReportPdfBuffer(
  campaignId: string,
  options: BuildCampaignReportOptions = {},
): Promise<Buffer> {
  const params = await loadCampaignReportPdfParams(campaignId, options);
  return campaignCompletionPdfToBuffer(params);
}
