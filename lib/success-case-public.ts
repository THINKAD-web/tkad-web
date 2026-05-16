/** Serializable shapes for public /cases pages (RSC → client). */

import type { CaseStudyMetric } from "@/lib/campaign-case-study";

export type CaseStudyMediaLink = {
  id?: string;
  label: string;
};

export type PublicSuccessCaseListItem = {
  id: string;
  industry: string;
  /** 익명 브랜드·업종 표기 */
  clientName: string;
  titleKo: string;
  titleEn: string | null;
  /** 캠페인 배경 (1~2줄) */
  summaryKo: string;
  thumbnailUrl: string | null;
  mediaUsed: string[];
  mediaIds: string[];
  publishedAtIso: string | null;
  periodStartIso: string | null;
  periodEndIso: string | null;
  budgetRange: string | null;
  /** 카드용 핵심 지표 (최대 3) */
  highlightMetrics: CaseStudyMetric[];
};

export type PublicSuccessCaseDetail = PublicSuccessCaseListItem & {
  challengeKo: string;
  solutionKo: string;
  resultsKo: string[];
  metricsJson: Record<string, unknown> | null;
  structuredMetrics: CaseStudyMetric[];
  galleryUrls: string[];
  /** 담당자 코멘트 (인물명 없음) */
  managerCommentKo: string | null;
  /** 집행 매체 — id 있으면 상세 링크 */
  mediaLinks: CaseStudyMediaLink[];
  /** @deprecated managerCommentKo 사용. 하위 호환 */
  testimonialKo: string | null;
};
