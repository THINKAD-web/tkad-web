import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";
import { parseTargetingOptions } from "@/lib/digital/parse-targeting-options";
import { lookupOnlineSlugMeta } from "@/lib/digital/online-slug-meta";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

export type LocalOnlineMediaRow = {
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  onlineSpec: {
    platform: string;
    minBudget: number;
    cpcMin: number | null;
    cpcMax: number | null;
    cpmMin: number | null;
    cpmMax: number | null;
    targetingOptions: string[];
    strengths: string[];
    kpiHints: string[];
    bestFor: string[];
  };
};

function deriveBillingType(spec: LocalOnlineMediaRow["onlineSpec"]): string[] {
  const types: string[] = [];
  if (spec.cpcMin != null || spec.cpcMax != null) types.push("CPC");
  if (spec.cpmMin != null || spec.cpmMax != null) types.push("CPM");
  return types.length > 0 ? types : ["CPC"];
}

/** DB online row → dmpilot `PublicMediaView` shape for mix-engine port. */
export function toPublicMediaView(row: LocalOnlineMediaRow): PublicMediaView {
  const meta = lookupOnlineSlugMeta(row.slug);
  const spec = row.onlineSpec;
  const parsed = parseTargetingOptions(spec.targetingOptions);
  const fitGoals =
    parsed.fitGoals.length > 0
      ? parsed.fitGoals
      : meta
        ? [meta.objective]
        : [];
  const monthlyBudgetMin = spec.minBudget;

  return {
    slug: row.slug,
    nameKo: row.name,
    nameEn: row.nameEn?.trim() || row.name,
    channel: meta?.channel ?? "INTERNAL",
    objective: meta?.objective ?? fitGoals[0] ?? "AWARENESS",
    mediaType: meta?.mediaType ?? null,
    platform: spec.platform,
    billingType: deriveBillingType(spec),
    cpcMin: spec.cpcMin,
    cpcMax: spec.cpcMax,
    cpmMin: spec.cpmMin,
    cpmMax: spec.cpmMax,
    minBudget: spec.minBudget,
    monthlyBudgetMin,
    monthlyBudgetMax: monthlyBudgetMin * 10,
    descriptionKo: row.description?.trim() || "",
    descriptionEn: row.descriptionEn?.trim() || row.nameEn?.trim() || row.name,
    featuresKo: [],
    kpiHintsKo: spec.kpiHints,
    fitIndustries:
      parsed.fitIndustries.length > 0 ? parsed.fitIndustries : ["LOCAL"],
    fitGoals,
    ageTargets:
      parsed.ageTargets.length > 0 ? parsed.ageTargets : ["25-34"],
    genderTarget: parsed.genderTarget ?? "ALL",
    interests: parsed.interests,
    geoTargeting:
      parsed.geoTargeting.length > 0 ? parsed.geoTargeting : ["KR"],
    audienceSize: null,
    strengths: spec.strengths.length > 0 ? spec.strengths : spec.bestFor,
    idealFor: spec.bestFor,
    verified: true,
    isPromotion: false,
    mediaKitUrl: null,
    logoUrl: null,
    sourceNote: null,
    sortOrder: meta?.sortOrder ?? 999,
  };
}

/** Subset for integrated planner platform bridge (6a). */
export function toDigitalCatalogItem(view: PublicMediaView): DigitalCatalogItem {
  return {
    slug: view.slug,
    nameKo: view.nameKo,
    channel: view.channel,
    platform: view.platform,
    mediaType: view.mediaType,
    cpcMin: view.cpcMin,
    cpcMax: view.cpcMax,
    cpmMin: view.cpmMin,
    cpmMax: view.cpmMax,
  };
}

export function localOnlineRowsToDigitalCatalogItems(
  rows: readonly LocalOnlineMediaRow[],
): DigitalCatalogItem[] {
  return rows.map((row) => toDigitalCatalogItem(toPublicMediaView(row)));
}

export function localOnlineRowsToPublicMediaViews(
  rows: readonly LocalOnlineMediaRow[],
): PublicMediaView[] {
  return rows.map(toPublicMediaView);
}
