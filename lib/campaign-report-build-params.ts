import type { BuildCampaignCompletionPdfParams } from "@/lib/build-campaign-completion-pdf";
import type { GenerateCampaignReportBody } from "@/lib/campaign-report-types";
import { getPrisma } from "@/lib/prisma";

export type BuildCampaignReportOptions = {
  brandName?: string;
  period?: { start?: string; end?: string };
  mediaIds?: string[];
  metrics?: GenerateCampaignReportBody["metrics"];
  accountManager?: string;
  nextCampaignProposal?: string;
};

export async function loadCampaignReportPdfParams(
  campaignId: string,
  options: BuildCampaignReportOptions = {},
): Promise<BuildCampaignCompletionPdfParams> {
  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      scheduleEvents: { orderBy: { startsAt: "asc" } },
      financialDocs: { orderBy: { createdAt: "desc" } },
      proofPhotos: { orderBy: { createdAt: "desc" }, take: 24 },
      mediaBookings: { include: { media: true } },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const mediaIdSet = options.mediaIds?.length
    ? new Set(options.mediaIds)
    : null;

  let bookings = campaign.mediaBookings;
  if (mediaIdSet) {
    bookings = bookings.filter(
      (b) => b.mediaId && mediaIdSet.has(b.mediaId),
    );
  }

  const startDate =
    options.period?.start != null && options.period.start !== ""
      ? new Date(options.period.start)
      : campaign.startDate;
  const endDate =
    options.period?.end != null && options.period.end !== ""
      ? new Date(options.period.end)
      : campaign.endDate;

  const brandDisplay =
    options.brandName?.trim() || campaign.clientCompany || campaign.name;

  return {
    campaignName: campaign.name,
    brandDisplayName: brandDisplay,
    clientCompany: options.brandName?.trim() || campaign.clientCompany,
    clientName: campaign.clientName,
    clientEmail: campaign.clientEmail,
    accountManager:
      options.accountManager?.trim() ||
      campaign.clientName ||
      process.env.THINKAD_REPORT_MANAGER_NAME?.trim() ||
      "THINKAD Media Team",
    status: campaign.status,
    notes: campaign.notes,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    scheduleEvents: campaign.scheduleEvents.map((e) => ({
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      kind: e.kind,
    })),
    proofPhotos: campaign.proofPhotos.map((p) => ({
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    financialDocs: campaign.financialDocs.map((d) => ({
      kind: d.kind,
      title: d.title,
      amountKrw: d.amountKrw,
      status: d.status,
    })),
    mediaBookings: bookings.map((b) => ({
      title: b.title,
      mediaName: b.media?.name ?? "—",
      location: b.media?.location ?? "—",
      type: b.media?.type ?? "—",
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
      dailyFootTraffic: b.media?.dailyFootfall ?? null,
      region: b.media?.region ?? null,
      trafficPattern:
        (
          b.media as {
            trafficPattern?: {
              hourly?: number[];
              weekly?: number[];
              monthly?: number[];
            } | null;
          } | null
        )?.trafficPattern ?? null,
    })),
    metricsOverride: options.metrics ?? undefined,
    nextCampaignProposal: options.nextCampaignProposal ?? null,
  };
}
