/** Serializable shapes for public /cases pages (RSC → client). */

export type PublicSuccessCaseListItem = {
  id: string;
  industry: string;
  clientName: string;
  titleKo: string;
  titleEn: string | null;
  summaryKo: string;
  thumbnailUrl: string | null;
  mediaUsed: string[];
  publishedAtIso: string | null;
};

export type PublicSuccessCaseDetail = PublicSuccessCaseListItem & {
  challengeKo: string;
  solutionKo: string;
  resultsKo: string[];
  metricsJson: Record<string, unknown> | null;
  periodStartIso: string | null;
  periodEndIso: string | null;
  galleryUrls: string[];
  testimonialKo: string | null;
};
