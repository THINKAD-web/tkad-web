/**
 * Campaign completion-report actions shared by /admin/campaigns and the reports hub.
 * Calls the existing generate-report / completion-report routes — no second pipeline.
 */

import {
  campaignReportPreviewHeader,
  type CampaignReportIdentitySource,
} from "@/lib/admin-campaign-report-identity";
import type { CampaignReportData } from "@/components/campaign-report-preview";

export function campaignCompletionReportHref(campaignId: string): string {
  return `/api/admin/campaigns/${campaignId}/completion-report`;
}

export type GenerateCampaignReportResult = {
  ok: boolean;
  error?: string;
  emailed?: boolean;
  reportGeneratedAt?: string | null;
  skipped?: boolean;
  reason?: string | null;
};

export async function postGenerateCampaignCompletionReport(
  campaignId: string,
): Promise<GenerateCampaignReportResult> {
  const res = await fetch(
    `/api/admin/campaigns/${campaignId}/generate-report`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    },
  );
  const j = (await res.json().catch(() => ({}))) as GenerateCampaignReportResult;
  return { ...j, ok: res.ok };
}

type ApiBooking = {
  title: string;
  media?: {
    name?: string | null;
    location?: string | null;
    dailyFootfall?: number | null;
    impressions?: number | null;
    visibilityScore?: number | null;
    type?: string | null;
    region?: string | null;
    operatingHours?: string | null;
    trafficPattern?: {
      hourly?: number[];
      weekly?: number[];
      monthly?: number[];
    } | null;
  } | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

type ApiEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  kind: string;
};

type ApiProof = { imageUrl: string; caption?: string | null };

type ApiDoc = {
  kind: string;
  title: string;
  amountKrw?: number | null;
  status: string;
};

export function assembleCampaignReportPreviewData(args: {
  campaign: CampaignReportIdentitySource;
  statusLabel: string;
  scheduleEvents?: ApiEvent[] | null;
  proofPhotos?: ApiProof[] | null;
  mediaBookings?: ApiBooking[] | null;
  financialDocs?: ApiDoc[] | null;
  includeImages?: boolean;
}): CampaignReportData {
  const header = campaignReportPreviewHeader(args.campaign, args.statusLabel);
  const includeImages = args.includeImages !== false;
  return {
    ...header,
    scheduleEvents: (args.scheduleEvents ?? []).map((e) => ({
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      kind: e.kind,
    })),
    proofPhotos: includeImages
      ? (args.proofPhotos ?? []).map((p) => ({
          imageUrl: p.imageUrl,
          caption: p.caption,
        }))
      : [],
    mediaBookings: (args.mediaBookings ?? []).map((b) => ({
      title: b.title,
      mediaName: b.media?.name ?? "—",
      location: b.media?.location ?? "—",
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
      dailyFootTraffic: b.media?.dailyFootfall ?? null,
      type: b.media?.type ?? null,
      region: b.media?.region ?? null,
      visibilityScore: b.media?.visibilityScore ?? null,
      operatingHours: b.media?.operatingHours ?? null,
      impressions: b.media?.impressions ?? null,
      trafficPattern: b.media?.trafficPattern ?? null,
    })),
    financialDocs: (args.financialDocs ?? []).map((f) => ({
      kind: f.kind,
      title: f.title,
      amountKrw: f.amountKrw,
      status: f.status,
    })),
  };
}

export function campaignNotesAsProposalPaste(c: {
  name: string;
  clientCompany?: string | null;
  clientName?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): string {
  const budget =
    c.budgetMin || c.budgetMax
      ? `예산 ${c.budgetMin ?? c.budgetMax}원`
      : "";
  const period =
    c.startDate || c.endDate
      ? `기간 ${c.startDate?.slice(0, 10) ?? "?"} ~ ${c.endDate?.slice(0, 10) ?? "?"}`
      : "";
  return [
    c.name,
    c.clientCompany ? `고객사 ${c.clientCompany}` : "",
    c.clientName ? `담당 ${c.clientName}` : "",
    period,
    budget,
    c.notes?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
