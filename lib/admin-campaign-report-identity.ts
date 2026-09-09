/**
 * Admin campaign completion-report preview header SSOT.
 * Must match the Campaign row fields that the server PDF reads from Prisma —
 * never the "새 캠페인" create form.
 */

export type CampaignReportIdentitySource = {
  id: string;
  name: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

export type CampaignReportPreviewHeader = {
  campaignName: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
};

export function selectedCampaignReportIdentity<
  T extends CampaignReportIdentitySource,
>(list: readonly T[], selectedId: string | null): T | null {
  if (!selectedId) return null;
  return list.find((c) => c.id === selectedId) ?? null;
}

export function campaignReportPreviewHeader(
  campaign: CampaignReportIdentitySource,
  statusLabel: string,
): CampaignReportPreviewHeader {
  return {
    campaignName: campaign.name,
    clientCompany: campaign.clientCompany ?? "",
    clientName: campaign.clientName,
    clientEmail: campaign.clientEmail,
    status: statusLabel,
    notes: campaign.notes ?? null,
    startDate: campaign.startDate ?? null,
    endDate: campaign.endDate ?? null,
    budgetMin: campaign.budgetMin ?? null,
    budgetMax: campaign.budgetMax ?? null,
  };
}
