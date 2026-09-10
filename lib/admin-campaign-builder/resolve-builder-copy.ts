import { campaignBuilderCopy } from "@/lib/admin-campaign-builder/copy-ko";
import type {
  CampaignBuilderDocumentType,
  CampaignInsightsOverride,
} from "@/lib/admin-campaign-builder/schemas";

export type BuilderSectionTitlesResolved = {
  digital: string;
  ooh: string;
  custom: string;
  kpi: string;
  donut: string;
  insights: string;
};

export type BuilderSectionNoticesResolved = {
  digitalEstimateNotice: string;
  oohSectionNotice?: string;
  executionNotice: string;
  insightsHint: string;
};

export type BuilderInsightSubtitlesResolved = {
  pacing: string;
  creative: string;
  operational: string;
};

export type BuilderSectionCopyResolved = {
  titles: BuilderSectionTitlesResolved;
  notices: BuilderSectionNoticesResolved;
  insightSubtitles: BuilderInsightSubtitlesResolved;
};

export function defaultBuilderSectionTitles(
  documentType: CampaignBuilderDocumentType,
  isKo: boolean,
): BuilderSectionTitlesResolved {
  const copy = campaignBuilderCopy[documentType];
  return {
    digital: copy.sectionTitles.estimateProducts,
    ooh:
      documentType === "report" && isKo
        ? "② OOH 매체"
        : isKo
          ? "OOH 매체"
          : "OOH media",
    custom: copy.sectionTitles.executionGroup,
    kpi: isKo ? "KPI" : "KPI summary",
    donut: isKo ? "채널 예산 구성" : "Channel budget mix",
    insights: copy.sectionTitles.insightsGroup,
  };
}

export function defaultBuilderInsightSubtitles(
  isKo: boolean,
): BuilderInsightSubtitlesResolved {
  return {
    pacing: isKo ? "소진 페이스" : "Spend pace",
    creative: isKo ? "소재 방향" : "Creative direction",
    operational: isKo ? "운영 메모" : "Operations notes",
  };
}

export function defaultBuilderSectionNotices(
  documentType: CampaignBuilderDocumentType,
): BuilderSectionNoticesResolved {
  const copy = campaignBuilderCopy[documentType];
  return {
    digitalEstimateNotice: copy.estimateNotice,
    oohSectionNotice: undefined,
    executionNotice: copy.executionNotice,
    insightsHint: copy.insightsHint,
  };
}

export function resolveBuilderSectionTitles(
  documentType: CampaignBuilderDocumentType,
  isKo: boolean,
  override?: CampaignInsightsOverride,
): BuilderSectionTitlesResolved {
  const base = defaultBuilderSectionTitles(documentType, isKo);
  const patch = override?.sectionTitles;
  if (!patch) return base;

  return {
    digital: patch.digital ?? base.digital,
    ooh: patch.ooh ?? base.ooh,
    custom: patch.custom ?? base.custom,
    kpi: patch.kpi ?? base.kpi,
    donut: patch.donut ?? base.donut,
    insights: patch.insights ?? base.insights,
  };
}

export function resolveBuilderSectionNotices(
  documentType: CampaignBuilderDocumentType,
  override?: CampaignInsightsOverride,
): BuilderSectionNoticesResolved {
  const base = defaultBuilderSectionNotices(documentType);
  const patch = override?.sectionNotices;
  if (!patch) return base;

  return {
    digitalEstimateNotice:
      patch.digitalEstimateNotice ?? base.digitalEstimateNotice,
    oohSectionNotice: patch.oohSectionNotice ?? base.oohSectionNotice,
    executionNotice: patch.executionNotice ?? base.executionNotice,
    insightsHint: patch.insightsHint ?? base.insightsHint,
  };
}

export function resolveBuilderInsightSubtitles(
  isKo: boolean,
  override?: CampaignInsightsOverride,
): BuilderInsightSubtitlesResolved {
  const base = defaultBuilderInsightSubtitles(isKo);
  const patch = override?.insightSubtitles;
  if (!patch) return base;

  return {
    pacing: patch.pacing ?? base.pacing,
    creative: patch.creative ?? base.creative,
    operational: patch.operational ?? base.operational,
  };
}

export function resolveBuilderSectionCopy(
  documentType: CampaignBuilderDocumentType,
  isKo: boolean,
  override?: CampaignInsightsOverride,
): BuilderSectionCopyResolved {
  return {
    titles: resolveBuilderSectionTitles(documentType, isKo, override),
    notices: resolveBuilderSectionNotices(documentType, override),
    insightSubtitles: resolveBuilderInsightSubtitles(isKo, override),
  };
}
