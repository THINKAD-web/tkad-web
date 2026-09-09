import type {
  CampaignBuilderPayload,
  CampaignInsightsOverride,
} from "@/lib/admin-campaign-builder/schemas";
import { totalBudgetWon } from "@/lib/admin-campaign-builder/aggregate-kpis";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { MediaItem } from "@/lib/media-data";
import { buildOnlineReportInsights } from "@/lib/planner-report-export/online-report-insights";
import type { PlannerExportOnlineInsights } from "@/lib/planner-report-export/types";

export type CampaignInsights = PlannerExportOnlineInsights;

export type CampaignBuilderCatalogContext = {
  views: PublicMediaView[];
  isKo?: boolean;
};

function viewToMediaItem(view: PublicMediaView): MediaItem {
  return {
    id: view.slug,
    slug: view.slug,
    name: view.nameKo,
    nameEn: view.nameEn,
    location: "",
    locationEn: "",
    region: "",
    type: view.mediaType ?? "digital",
    onlineSpec: {
      platform: view.platform ?? undefined,
      minBudget: view.minBudget ?? view.monthlyBudgetMin,
      cpcMin: view.cpcMin,
      cpcMax: view.cpcMax,
      cpmMin: view.cpmMin,
      cpmMax: view.cpmMax,
    },
  } as MediaItem;
}

export function buildCampaignBuilderInsights(
  payload: CampaignBuilderPayload,
  catalogContext: CampaignBuilderCatalogContext,
): CampaignInsights {
  const isKo = catalogContext.isKo ?? true;
  const viewBySlug = new Map(catalogContext.views.map((v) => [v.slug, v]));

  const portfolio = payload.digitalLines
    .map((line) => viewBySlug.get(line.slug))
    .filter((v): v is PublicMediaView => v != null)
    .map(viewToMediaItem);

  const notesText = payload.notes?.trim() ?? "";
  const clientText = [payload.clientCompany, payload.clientName]
    .filter(Boolean)
    .join(" ");

  return buildOnlineReportInsights({
    isKo,
    portfolio,
    ageText: notesText || clientText || "미지정",
    regionsText: notesText || "미지정",
    channelCount: payload.digitalLines.length,
    budgetWon: totalBudgetWon(payload),
    months: 1,
  });
}

export function applyInsightsOverride(
  base: CampaignInsights,
  override?: CampaignInsightsOverride,
): CampaignInsights {
  if (!override) return base;

  return {
    ...base,
    pacingPlan: override.pacingPlan ?? base.pacingPlan,
    creativeDirections: override.creativeDirections ?? base.creativeDirections,
    operationalNotes: override.operationalNotes ?? base.operationalNotes,
    disclaimer: base.disclaimer,
  };
}
