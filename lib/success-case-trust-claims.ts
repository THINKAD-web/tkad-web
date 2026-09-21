/**
 * 성공 사례 본문·지표에서 신뢰도 리스크가 있는 표현을 탐지 (읽기 전용 감사용).
 * DB 수정은 하지 않으며, 제품/법무 검토용 추출 목록을 만든다.
 */

export type TrustClaimRuleId =
  | "INDUSTRY_BENCHMARK"
  | "PERCENT_IMPROVEMENT"
  | "SPECIFIC_CPM"
  | "ENGAGEMENT_RATE"
  | "SNS_COUNT"
  | "TREND_KEYWORD_COUNT";

export type TrustClaimHit = {
  ruleId: TrustClaimRuleId;
  labelKo: string;
  snippet: string;
  field: string;
};

const RULES: Array<{
  id: TrustClaimRuleId;
  labelKo: string;
  pattern: RegExp;
}> = [
  {
    id: "INDUSTRY_BENCHMARK",
    labelKo: "업계 평균 대비·벤치마크 주장",
    pattern: /업계\s*평균|industry\s+average|vs\.?\s*industry/i,
  },
  {
    id: "PERCENT_IMPROVEMENT",
    labelKo: "퍼센트 개선·효율 주장",
    pattern: /\d+\s*%\s*(효율|개선|향상|p\b|point)|\d+%p/i,
  },
  {
    id: "SPECIFIC_CPM",
    labelKo: "구체 CPM 수치",
    pattern: /CPM\s*[:：]?\s*약?\s*[₩]?\s*[\d,]+|\bCPM\b[^.\n]{0,24}[\d,]+원/i,
  },
  {
    id: "ENGAGEMENT_RATE",
    labelKo: "참여율 수치",
    pattern: /참여율\s*[\d.]+\s*%|engagement\s*rate\s*[\d.]+\s*%/i,
  },
  {
    id: "SNS_COUNT",
    labelKo: "SNS·UGC 건수 주장",
    pattern: /(?:인스타|instagram|SNS|게시물|UGC)[^.\n]{0,40}[\d,]+\s*건/i,
  },
  {
    id: "TREND_KEYWORD_COUNT",
    labelKo: "실시간 트렌드·키워드 등장 횟수",
    pattern: /트렌드[^.\n]{0,30}[\d,]+\s*회|키워드[^.\n]{0,30}[\d,]+\s*회/i,
  },
];

function scanText(field: string, text: string): TrustClaimHit[] {
  const hits: TrustClaimHit[] = [];
  for (const rule of RULES) {
    const m = text.match(rule.pattern);
    if (!m) continue;
    const start = Math.max(0, m.index! - 20);
    const end = Math.min(text.length, m.index! + m[0].length + 40);
    hits.push({
      ruleId: rule.id,
      labelKo: rule.labelKo,
      snippet: text.slice(start, end).replace(/\s+/g, " ").trim(),
      field,
    });
  }
  return hits;
}

export function extractTrustClaimHitsFromSuccessCaseFields(fields: {
  id: string;
  titleKo: string;
  summaryKo: string;
  challengeKo: string;
  solutionKo: string;
  resultsKo: string[];
  metricsJson: unknown;
}): TrustClaimHit[] {
  const hits: TrustClaimHit[] = [];
  const push = (field: string, text: string | null | undefined) => {
    if (!text?.trim()) return;
    hits.push(...scanText(field, text));
  };

  push("titleKo", fields.titleKo);
  push("summaryKo", fields.summaryKo);
  push("challengeKo", fields.challengeKo);
  push("solutionKo", fields.solutionKo);
  for (let i = 0; i < fields.resultsKo.length; i++) {
    push(`resultsKo[${i}]`, fields.resultsKo[i]);
  }
  if (fields.metricsJson && typeof fields.metricsJson === "object") {
    push("metricsJson", JSON.stringify(fields.metricsJson));
  }

  return hits;
}

export function isSeedSuccessCaseMetrics(metricsJson: unknown): boolean {
  return (
    !!metricsJson &&
    typeof metricsJson === "object" &&
    (metricsJson as Record<string, unknown>).seed === true
  );
}
