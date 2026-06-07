/**
 * 모델별 토큰 단가(추정, USD per 1M tokens, input+output 블렌디드).
 * 로그의 tokensUsed 는 input+output 합산이라 블렌디드 단가로 비용을 추정한다.
 * 실제 단가와 다를 수 있어 어디서나 "추정"으로 표기할 것.
 */
const BLENDED_USD_PER_1M: Array<{ match: RegExp; usd: number; label: string }> = [
  { match: /haiku/i, usd: 2.5, label: "Haiku" },
  { match: /sonnet/i, usd: 9, label: "Sonnet" },
  { match: /opus/i, usd: 45, label: "Opus" },
  { match: /grok/i, usd: 9, label: "Grok" },
];
const DEFAULT_USD_PER_1M = 9;

export function modelFamilyLabel(model: string | null | undefined): string {
  if (!model) return "기타";
  return BLENDED_USD_PER_1M.find((r) => r.match.test(model))?.label ?? model;
}

export function blendedUsdPer1M(model: string | null | undefined): number {
  if (!model) return DEFAULT_USD_PER_1M;
  return BLENDED_USD_PER_1M.find((r) => r.match.test(model))?.usd ?? DEFAULT_USD_PER_1M;
}

/** 토큰 수 → 추정 비용(USD) */
export function estimateCostUsd(model: string | null | undefined, tokens: number): number {
  return (tokens / 1_000_000) * blendedUsdPer1M(model);
}

/** 기능 type → 한글 라벨 */
export function featureLabel(type: string): string {
  const map: Record<string, string> = {
    chatbot: "공개 챗봇",
    recommendation: "AI 추천",
    chat_reply: "상담 답변",
    creative_review: "크리에이티브 검토",
    trend_report: "트렌드 리포트",
    academy_lesson: "아카데미 레슨",
    success_case: "성공 사례",
    campaign_report: "캠페인 리포트",
    campaign_completion_pdf: "캠페인 완료 리포트",
  };
  return map[type] ?? type;
}
