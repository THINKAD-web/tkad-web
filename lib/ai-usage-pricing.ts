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

// ── 환경변수 기반 정확 단가(입력/출력 분리, USD per 1M tokens) ──
function envNum(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

type IoRate = { in: number; out: number };

/** 모델 패밀리별 입력/출력 단가. ANTHROPIC_{FAMILY}_{INPUT|OUTPUT}_PER_1M 로 override. */
function ioRateFor(model: string | null | undefined): IoRate {
  const m = (model ?? "").toLowerCase();
  if (/haiku/.test(m)) {
    return {
      in: envNum("ANTHROPIC_HAIKU_INPUT_PER_1M", 1),
      out: envNum("ANTHROPIC_HAIKU_OUTPUT_PER_1M", 5),
    };
  }
  if (/opus/.test(m)) {
    return {
      in: envNum("ANTHROPIC_OPUS_INPUT_PER_1M", 15),
      out: envNum("ANTHROPIC_OPUS_OUTPUT_PER_1M", 75),
    };
  }
  // sonnet · 기타 기본
  return {
    in: envNum("ANTHROPIC_SONNET_INPUT_PER_1M", 3),
    out: envNum("ANTHROPIC_SONNET_OUTPUT_PER_1M", 15),
  };
}

/** 입력/출력 토큰 → 정확 비용(USD). 단가는 환경변수 우선. */
export function costUsdFromIO(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const r = ioRateFor(model);
  return (inputTokens / 1_000_000) * r.in + (outputTokens / 1_000_000) * r.out;
}

/** USD → KRW 환산 (ANTHROPIC_USD_KRW, 기본 1,450) */
export const USD_KRW = envNum("ANTHROPIC_USD_KRW", 1450);
export function usdToKrw(usd: number): number {
  return Math.round(usd * USD_KRW);
}

/** 기능 type → 한글 라벨 */
export function featureLabel(type: string): string {
  const map: Record<string, string> = {
    chatbot: "공개 챗봇",
    recommendation: "AI 추천",
    content: "콘텐츠 생성",
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
