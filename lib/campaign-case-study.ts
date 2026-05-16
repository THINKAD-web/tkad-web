/**
 * 공개 캠페인 케이스 스터디 도메인 타입.
 * Prisma `SuccessCase` + `metricsJson` 표준 키와 정렬됩니다.
 */

export type CaseStudyMetricKey =
  | "impressions"
  | "cpm"
  | "brandLift"
  | "reachUplift"
  | "panels"
  | "custom";

export type CaseStudyMetric = {
  key: CaseStudyMetricKey | string;
  labelKo: string;
  labelEn: string;
  valueKo: string;
  valueEn?: string;
};

export type CaseStudyMediaPlacement = {
  /** 카탈로그 `Media.id` — 있으면 `/media/[id]` 링크 */
  mediaId?: string;
  labelKo: string;
  labelEn: string;
};

/** 정적 샘플·시드용 풀 구조 (DB row와 1:1 대응 가능) */
export type CampaignCaseStudy = {
  id: string;
  industry: string;
  /** 예: 글로벌 뷰티 브랜드 A사 */
  brandLabelKo: string;
  brandLabelEn: string;
  titleKo: string;
  titleEn: string;
  /** 캠페인 배경 1~2줄 */
  backgroundKo: string;
  backgroundEn: string;
  challengeKo: string;
  challengeEn: string;
  solutionKo: string;
  solutionEn: string;
  mediaPlacements: CaseStudyMediaPlacement[];
  periodStartIso: string;
  periodEndIso: string;
  budgetRangeKo: string;
  budgetRangeEn: string;
  metrics: CaseStudyMetric[];
  resultsKo: string[];
  resultsEn: string[];
  thumbnailUrl: string | null;
  galleryUrls: string[];
  /** 익명 담당자 코멘트 (인물명 없음) */
  managerCommentKo?: string | null;
  managerCommentEn?: string | null;
  publishedAtIso: string;
};

const METRIC_LABELS: Record<
  CaseStudyMetricKey,
  { labelKo: string; labelEn: string }
> = {
  impressions: { labelKo: "총 노출", labelEn: "Impressions" },
  cpm: { labelKo: "CPM", labelEn: "CPM" },
  brandLift: { labelKo: "브랜드 리프트", labelEn: "Brand lift" },
  reachUplift: { labelKo: "도달 증가", labelEn: "Reach uplift" },
  panels: { labelKo: "집행 면수", labelEn: "Panels" },
  custom: { labelKo: "지표", labelEn: "Metric" },
};

/** DB `metricsJson` → 표준 지표 배열 */
export function parseCaseStudyMetrics(
  raw: Record<string, unknown> | null | undefined,
  locale: string,
): CaseStudyMetric[] {
  if (!raw || typeof raw !== "object") return [];
  const isKo = locale !== "en";
  const out: CaseStudyMetric[] = [];

  const known: CaseStudyMetricKey[] = [
    "impressions",
    "cpm",
    "brandLift",
    "reachUplift",
    "panels",
  ];

  for (const key of known) {
    const vKo = raw[key];
    const vEn = raw[`${key}En`];
    const val = isKo ? vKo ?? vEn : vEn ?? vKo;
    if (val == null || String(val).trim() === "") continue;
    const labels = METRIC_LABELS[key];
    out.push({
      key,
      labelKo: labels.labelKo,
      labelEn: labels.labelEn,
      valueKo: String(vKo ?? val),
      valueEn: vEn != null ? String(vEn) : undefined,
    });
  }

  const extras = raw._extras;
  if (Array.isArray(extras)) {
    for (const item of extras) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const labelKo = String(o.labelKo ?? o.label ?? "");
      const valueKo = String(o.valueKo ?? o.value ?? "");
      if (!labelKo || !valueKo) continue;
      out.push({
        key: String(o.key ?? "custom"),
        labelKo,
        labelEn: String(o.labelEn ?? labelKo),
        valueKo,
        valueEn: o.valueEn != null ? String(o.valueEn) : undefined,
      });
    }
  }

  return out;
}

export function formatCaseStudyMetricValue(m: CaseStudyMetric, locale: string) {
  const isKo = locale !== "en";
  if (isKo) return m.valueKo;
  return m.valueEn?.trim() ? m.valueEn : m.valueKo;
}

export function parseBudgetRangeFromMetrics(
  raw: Record<string, unknown> | null | undefined,
  locale: string,
): string | null {
  if (!raw) return null;
  const isKo = locale !== "en";
  const v = isKo ? raw.budgetRangeKo : raw.budgetRangeEn ?? raw.budgetRangeKo;
  if (v == null || String(v).trim() === "") return null;
  return String(v);
}

export function metricsToJsonRecord(
  study: Pick<CampaignCaseStudy, "metrics" | "budgetRangeKo" | "budgetRangeEn">,
): Record<string, unknown> {
  const json: Record<string, unknown> = {
    budgetRangeKo: study.budgetRangeKo,
    budgetRangeEn: study.budgetRangeEn,
  };
  for (const m of study.metrics) {
    json[m.key] = m.valueKo;
    if (m.valueEn) json[`${m.key}En`] = m.valueEn;
  }
  return json;
}

export function campaignCaseToMetricsRecord(
  study: CampaignCaseStudy,
): Record<string, unknown> {
  return metricsToJsonRecord(study);
}
