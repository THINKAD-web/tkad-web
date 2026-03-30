import type { Prisma } from "@prisma/client";
import { caseStudies } from "@/lib/case-studies";
import type {
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";

/** Stable id for the built-in sample (matches CUID-style public route regex). */
export const SAMPLE_SUCCESS_CASE_ID = "ctkadglobalsamplebeauty0001";

const sample = caseStudies[0];

const SAMPLE_PUBLISHED_AT = new Date("2024-01-15T00:00:00.000Z");
const SAMPLE_PERIOD_START = new Date("2024-06-01T00:00:00.000Z");
const SAMPLE_PERIOD_END = new Date("2024-07-15T00:00:00.000Z");

export function getSampleSuccessCaseListItem(): PublicSuccessCaseListItem {
  return {
    id: SAMPLE_SUCCESS_CASE_ID,
    industry: "Beauty",
    clientName: sample.client,
    titleKo: sample.title,
    titleEn: sample.titleEn,
    summaryKo: sample.description,
    thumbnailUrl: null,
    mediaUsed: [...sample.mediaUsed],
    publishedAtIso: SAMPLE_PUBLISHED_AT.toISOString(),
  };
}

export function getSampleSuccessCaseDetail(): PublicSuccessCaseDetail {
  const base = getSampleSuccessCaseListItem();
  return {
    ...base,
    challengeKo: sample.campaignGoal,
    solutionKo: `${sample.managerComment}\n\n집행 매체: ${sample.mediaUsed.join(", ")}`,
    resultsKo: [
      sample.results,
      `총 노출 ${sample.exposures}`,
      `도달 ${sample.reachIncrease}`,
    ],
    metricsJson: Object.fromEntries(
      sample.stats.map((s) => [s.label, s.value]),
    ),
    periodStartIso: SAMPLE_PERIOD_START.toISOString(),
    periodEndIso: SAMPLE_PERIOD_END.toISOString(),
    galleryUrls: [],
    testimonialKo: sample.testimonial,
  };
}

/** Prisma upsert payload for `prisma/seed.ts` (keeps DB in sync with the sample copy). */
export function sampleSuccessCaseSeedData(): Prisma.SuccessCaseCreateInput {
  return {
    id: SAMPLE_SUCCESS_CASE_ID,
    status: "published",
    clientName: sample.client,
    industry: "Beauty",
    titleKo: sample.title,
    titleEn: sample.titleEn,
    summaryKo: sample.description,
    challengeKo: sample.campaignGoal,
    solutionKo: `${sample.managerComment}\n\n집행 매체: ${sample.mediaUsed.join(", ")}`,
    resultsKo: [
      sample.results,
      `총 노출 ${sample.exposures}`,
      `도달 ${sample.reachIncrease}`,
    ],
    metricsJson: Object.fromEntries(
      sample.stats.map((s) => [s.label, s.value]),
    ),
    mediaUsed: [...sample.mediaUsed],
    periodStart: SAMPLE_PERIOD_START,
    periodEnd: SAMPLE_PERIOD_END,
    thumbnailUrl: null,
    galleryUrls: [],
    testimonialKo: sample.testimonial,
    publishedAt: SAMPLE_PUBLISHED_AT,
  };
}
