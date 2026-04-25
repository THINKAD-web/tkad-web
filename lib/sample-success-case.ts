import type { Prisma } from "@prisma/client";
import { caseStudies, type CaseStudyVertical } from "@/lib/case-studies";
import type {
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";

/** Stable ids for built-in samples (matches CUID-style public route regex). */
export const SAMPLE_SUCCESS_CASE_IDS = [
  "ctkadglobalsamplebeauty0001",
  "ctkadglobalsampletechcoex02",
  "ctkadglobalsampleentertain03",
] as const;

/** @deprecated Use SAMPLE_SUCCESS_CASE_IDS[0]; kept for imports that expect one id. */
export const SAMPLE_SUCCESS_CASE_ID = SAMPLE_SUCCESS_CASE_IDS[0];

const SAMPLE_META: readonly {
  publishedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}[] = [
  {
    publishedAt: new Date("2024-03-15T00:00:00.000Z"),
    periodStart: new Date("2024-06-01T00:00:00.000Z"),
    periodEnd: new Date("2024-07-15T00:00:00.000Z"),
  },
  {
    publishedAt: new Date("2024-02-10T00:00:00.000Z"),
    periodStart: new Date("2024-02-01T00:00:00.000Z"),
    periodEnd: new Date("2024-02-14T00:00:00.000Z"),
  },
  {
    publishedAt: new Date("2024-01-20T00:00:00.000Z"),
    periodStart: new Date("2024-04-01T00:00:00.000Z"),
    periodEnd: new Date("2024-04-28T00:00:00.000Z"),
  },
];

function industryFromVertical(v: CaseStudyVertical): string {
  const map: Record<CaseStudyVertical, string> = {
    fashion_beauty: "Beauty",
    automotive: "Automotive",
    fb: "F&B",
    tech: "Tech",
    entertainment: "Entertainment",
    finance: "Finance",
  };
  return map[v];
}

function buildSampleListItem(
  index: 0 | 1 | 2,
): PublicSuccessCaseListItem {
  const sample = caseStudies[index];
  const meta = SAMPLE_META[index];
  return {
    id: SAMPLE_SUCCESS_CASE_IDS[index],
    industry: industryFromVertical(sample.vertical),
    clientName: sample.client,
    titleKo: sample.title,
    titleEn: sample.titleEn,
    summaryKo: sample.description,
    thumbnailUrl: null,
    mediaUsed: [...sample.mediaUsed],
    mediaIds: [],
    publishedAtIso: meta.publishedAt.toISOString(),
  };
}

export function getSampleSuccessCaseListItems(): PublicSuccessCaseListItem[] {
  return [
    buildSampleListItem(0),
    buildSampleListItem(1),
    buildSampleListItem(2),
  ];
}

/** First sample only (legacy). Prefer {@link getSampleSuccessCaseListItems}. */
export function getSampleSuccessCaseListItem(): PublicSuccessCaseListItem {
  return buildSampleListItem(0);
}

export function getSampleSuccessCaseDetail(
  id: string,
): PublicSuccessCaseDetail | null {
  const index = SAMPLE_SUCCESS_CASE_IDS.findIndex((sid) => sid === id);
  if (index < 0 || index > 2) return null;

  const i = index as 0 | 1 | 2;
  const sample = caseStudies[i];
  const meta = SAMPLE_META[i];
  const base = buildSampleListItem(i);
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
    periodStartIso: meta.periodStart.toISOString(),
    periodEndIso: meta.periodEnd.toISOString(),
    galleryUrls: [],
    testimonialKo: sample.testimonial,
  };
}

export function isSampleSuccessCaseId(id: string): boolean {
  return (SAMPLE_SUCCESS_CASE_IDS as readonly string[]).includes(id);
}

/** Prisma upsert payloads for `prisma/seed.ts`. */
export function allSampleSuccessCaseSeedData(): Prisma.SuccessCaseCreateInput[] {
  return ([0, 1, 2] as const).map((i) => {
    const sample = caseStudies[i];
    const meta = SAMPLE_META[i];
    return {
      id: SAMPLE_SUCCESS_CASE_IDS[i],
      status: "published",
      clientName: sample.client,
      industry: industryFromVertical(sample.vertical),
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
      mediaIds: [],
      periodStart: meta.periodStart,
      periodEnd: meta.periodEnd,
      thumbnailUrl: null,
      galleryUrls: [],
      testimonialKo: sample.testimonial,
      publishedAt: meta.publishedAt,
    };
  });
}

/** @deprecated Use {@link allSampleSuccessCaseSeedData}[0]. */
export function sampleSuccessCaseSeedData(): Prisma.SuccessCaseCreateInput {
  return allSampleSuccessCaseSeedData()[0];
}
