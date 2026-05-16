import type { Prisma } from "@prisma/client";
import { campaignCaseStudies } from "@/data/campaign-cases";
import {
  campaignCaseToMetricsRecord,
  type CaseStudyMetric,
} from "@/lib/campaign-case-study";
import type {
  CaseStudyMediaLink,
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";

export const SAMPLE_SUCCESS_CASE_IDS = campaignCaseStudies.map((c) => c.id);

/** @deprecated Use SAMPLE_SUCCESS_CASE_IDS[0] */
export const SAMPLE_SUCCESS_CASE_ID = SAMPLE_SUCCESS_CASE_IDS[0];

function mediaLinks(study: (typeof campaignCaseStudies)[number]): CaseStudyMediaLink[] {
  return study.mediaPlacements.map((p) => ({
    id: p.mediaId,
    label: p.labelKo,
  }));
}

function buildListItem(
  study: (typeof campaignCaseStudies)[number],
  locale: string,
): PublicSuccessCaseListItem {
  const isKo = locale !== "en";
  const highlightMetrics: CaseStudyMetric[] = study.metrics.slice(0, 3);
  return {
    id: study.id,
    industry: study.industry,
    clientName: isKo ? study.brandLabelKo : study.brandLabelEn,
    titleKo: study.titleKo,
    titleEn: study.titleEn,
    summaryKo: study.backgroundKo,
    thumbnailUrl: study.thumbnailUrl,
    mediaUsed: study.mediaPlacements.map((p) =>
      isKo ? p.labelKo : p.labelEn,
    ),
    mediaIds: study.mediaPlacements
      .map((p) => p.mediaId)
      .filter((id): id is string => !!id),
    publishedAtIso: study.publishedAtIso,
    periodStartIso: study.periodStartIso,
    periodEndIso: study.periodEndIso,
    budgetRange: isKo ? study.budgetRangeKo : study.budgetRangeEn,
    highlightMetrics,
  };
}

export function getSampleSuccessCaseListItems(
  locale = "ko",
): PublicSuccessCaseListItem[] {
  return campaignCaseStudies.map((s) => buildListItem(s, locale));
}

export function getSampleSuccessCaseListItem(
  locale = "ko",
): PublicSuccessCaseListItem {
  return buildListItem(campaignCaseStudies[0], locale);
}

export function getSampleSuccessCaseDetail(
  id: string,
  locale = "ko",
): PublicSuccessCaseDetail | null {
  const study = campaignCaseStudies.find((c) => c.id === id);
  if (!study) return null;
  const isKo = locale !== "en";
  const base = buildListItem(study, locale);
  return {
    ...base,
    challengeKo: study.challengeKo,
    solutionKo: study.solutionKo,
    resultsKo: study.resultsKo,
    metricsJson: campaignCaseToMetricsRecord(study),
    structuredMetrics: study.metrics,
    galleryUrls: study.galleryUrls,
    managerCommentKo: study.managerCommentKo ?? null,
    testimonialKo: study.managerCommentKo ?? null,
    mediaLinks: mediaLinks(study).map((l) => ({
      ...l,
      label: isKo
        ? study.mediaPlacements.find((p) => p.mediaId === l.id)?.labelKo ?? l.label
        : study.mediaPlacements.find((p) => p.mediaId === l.id)?.labelEn ?? l.label,
    })),
  };
}

export function isSampleSuccessCaseId(id: string): boolean {
  return SAMPLE_SUCCESS_CASE_IDS.includes(id);
}

export function allSampleSuccessCaseSeedData(): Prisma.SuccessCaseCreateInput[] {
  return campaignCaseStudies.map((study) => ({
    id: study.id,
    status: "published",
    clientName: study.brandLabelKo,
    industry: study.industry,
    titleKo: study.titleKo,
    titleEn: study.titleEn,
    summaryKo: study.backgroundKo,
    challengeKo: study.challengeKo,
    solutionKo: study.solutionKo,
    resultsKo: study.resultsKo,
    metricsJson: campaignCaseToMetricsRecord(study) as Prisma.InputJsonValue,
    mediaUsed: study.mediaPlacements.map((p) => p.labelKo),
    mediaIds: study.mediaPlacements
      .map((p) => p.mediaId)
      .filter((id): id is string => !!id),
    periodStart: new Date(study.periodStartIso),
    periodEnd: new Date(study.periodEndIso),
    thumbnailUrl: study.thumbnailUrl,
    galleryUrls: study.galleryUrls,
    testimonialKo: study.managerCommentKo ?? null,
    publishedAt: new Date(study.publishedAtIso),
  }));
}

/** @deprecated Use {@link allSampleSuccessCaseSeedData}[0] */
export function sampleSuccessCaseSeedData(): Prisma.SuccessCaseCreateInput {
  return allSampleSuccessCaseSeedData()[0];
}
