/**
 * 모델별 토큰 단가 — 실제 공시가(USD per 1M tokens, input/output 분리).
 * 로그의 tokensUsed 는 input+output 합산만 있으므로, 가정 출력 비율
 * (AI_OUTPUT_TOKEN_RATIO, 기본 0.30)로 블렌디드 단가를 계산해 추정한다.
 *
 * 공시가(2026 기준, 변동 가능):
 *  - Claude Haiku 4.5 : in $1   / out $5
 *  - Claude Sonnet 4.5: in $3   / out $15
 *  - Claude Opus      : in $15  / out $75
 *  - xAI Grok-3       : in $3   / out $15 (근사)
 */
type Rate = { match: RegExp; inUsd: number; outUsd: number; label: string };

const RATES: Rate[] = [
  { match: /haiku/i, inUsd: 1, outUsd: 5, label: "Haiku" },
  { match: /sonnet/i, inUsd: 3, outUsd: 15, label: "Sonnet" },
  { match: /opus/i, inUsd: 15, outUsd: 75, label: "Opus" },
  { match: /grok/i, inUsd: 3, outUsd: 15, label: "Grok" },
];
const DEFAULT_RATE: Rate = { match: /.*/, inUsd: 3, outUsd: 15, label: "기타" };

/** 합산 토큰 중 출력 토큰이 차지하는 가정 비율 */
const OUTPUT_RATIO = (() => {
  const v = Number(process.env.AI_OUTPUT_TOKEN_RATIO ?? "0.3");
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.3;
})();

function rateFor(model: string | null | undefined): Rate {
  if (!model) return DEFAULT_RATE;
  return RATES.find((r) => r.match.test(model)) ?? DEFAULT_RATE;
}

export function modelFamilyLabel(model: string | null | undefined): string {
  if (!model) return "기타";
  return RATES.find((r) => r.match.test(model))?.label ?? model;
}

/** 블렌디드 단가(USD per 1M) = in*(1-r) + out*r */
export function blendedUsdPer1M(model: string | null | undefined): number {
  const r = rateFor(model);
  return r.inUsd * (1 - OUTPUT_RATIO) + r.outUsd * OUTPUT_RATIO;
}

/** 합산 토큰 → 추정 비용(USD) */
export function estimateCostUsd(
  model: string | null | undefined,
  tokens: number,
): number {
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
