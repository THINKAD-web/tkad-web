import type { TrendReport } from "@prisma/client";
import { getAnthropicClient, resolveModel } from "@/lib/ai-content-generator";
import type { WebSource } from "@/lib/insights/types";

/**
 * 자동 검증 레이어 — Claude self-check.
 *
 * 흐름:
 *   draft (generated) + sources → Claude (별도 호출) → 점수·이슈 → verdict
 *   pass (80+) | warning (60~80) | fail (<60)
 *
 * cron 통합:
 *   - pass:    status="published", publishedAt=now
 *   - warning: status="published", publishedAt=now (PR-4 에서 Slack 알림)
 *   - fail:    status="draft" 유지, publishedAt=null (운영 검토 후 수동 발행)
 *
 * 모듈 자체에 사이드 이펙트 없음. cron/admin route 가 결과 받아 status 결정.
 */

const VALIDATOR_TOOL = "emit_validation_result";

export type ValidationVerdict = "pass" | "warning" | "fail";
export type IssueCategory = "factual" | "legal" | "tone" | "seo";
export type IssueSeverity = "critical" | "warning" | "minor";

export interface ValidationIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  /** 본문에서 문제 부분 인용 (최대 200자) */
  location: string;
  explanation: string;
  suggestion: string;
}

export interface ValidationScores {
  /** 0~25 */
  factual: number;
  /** 0~25 */
  legal: number;
  /** 0~25 */
  tone: number;
  /** 0~25 */
  seo: number;
}

export interface ValidationResult {
  totalScore: number; // 0~100
  verdict: ValidationVerdict;
  scores: ValidationScores;
  issues: ValidationIssue[];
  shouldPublish: boolean;
  requiresHumanReview: boolean;
  modelUsed: string;
  validatedAt: string; // ISO
}

const SYSTEM_PROMPT = `당신은 THINKAD 의 OOH 광고 트렌드 리포트를 검증하는 전문가입니다.

[검증 항목 — 각 25점, 총 100점]

1. 팩트 정확성 (factual, 25점)
   - 통계·수치·사실이 출처와 일치하는가
   - 인용된 회사명·인물명·시점이 정확한가
   - 출처 없는 단정적 주장이 있는가

2. 법적 위험 (legal, 25점)
   - 특정 회사·인물에 대한 부정적 평가 (명예훼손)
   - 다른 매체 글 표절·저작권 침해
   - 허위사실 유포

3. 톤앤매너 (tone, 25점)
   - "최고의", "혁명적인" 등 과장 표현
   - 경쟁사 비방
   - THINKAD 외 특정 에이전시 추천/비추천
   - 전문적이지만 접근하기 쉬운 톤 유지

4. SEO·구조 (seo, 25점)
   - 제목 매력도·핵심 키워드 포함
   - 본문 구조 (도입·본론·결론)
   - 길이 적정성 (한글 2000~3000자 권장)
   - 메타 정보 완성도 (요약·태그·verticalStrategies)

[판정 기준]
- 80점 이상 + critical 이슈 0개 → "pass"  (자동 발행)
- 60~80점 또는 warning 이슈 있음   → "warning" (발행하되 운영팀 알림)
- 60점 미만 또는 critical 이슈 있음 → "fail"   (발행 보류)

emit_validation_result 도구를 정확히 한 번 호출해 응답하세요.`;

interface ValidatorToolInput {
  totalScore: number;
  verdict: ValidationVerdict;
  scores: ValidationScores;
  issues: ValidationIssue[];
  shouldPublish: boolean;
  requiresHumanReview: boolean;
}

function validatorTool() {
  return {
    name: VALIDATOR_TOOL,
    description: "검증 결과 1회 emit (점수·verdict·이슈 목록).",
    input_schema: {
      type: "object" as const,
      properties: {
        totalScore: { type: "number", minimum: 0, maximum: 100 },
        verdict: { type: "string", enum: ["pass", "warning", "fail"] },
        scores: {
          type: "object",
          properties: {
            factual: { type: "number", minimum: 0, maximum: 25 },
            legal: { type: "number", minimum: 0, maximum: 25 },
            tone: { type: "number", minimum: 0, maximum: 25 },
            seo: { type: "number", minimum: 0, maximum: 25 },
          },
          required: ["factual", "legal", "tone", "seo"],
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["factual", "legal", "tone", "seo"],
              },
              severity: {
                type: "string",
                enum: ["critical", "warning", "minor"],
              },
              location: { type: "string" },
              explanation: { type: "string" },
              suggestion: { type: "string" },
            },
            required: [
              "category",
              "severity",
              "location",
              "explanation",
              "suggestion",
            ],
          },
        },
        shouldPublish: { type: "boolean" },
        requiresHumanReview: { type: "boolean" },
      },
      required: [
        "totalScore",
        "verdict",
        "scores",
        "issues",
        "shouldPublish",
        "requiresHumanReview",
      ],
    },
  };
}

function buildSourcesBlock(sources: WebSource[]): string {
  if (sources.length === 0) {
    return "출처 없음 (LLM 내부 지식만 사용 — 팩트체크 불가능 항목은 minor 처리).";
  }
  return sources
    .slice(0, 8)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\n  URL: ${s.url}\n  발행: ${
          s.publishedAt ?? "미상"
        }\n  발췌: ${s.snippet.slice(0, 400)}`,
    )
    .join("\n\n");
}

function buildDraftBlock(draft: TrendReport): string {
  const summaryLine = draft.summaryKo.slice(0, 6).join(" / ");
  const marketLine = draft.marketTrendKo.slice(0, 5).join(" / ");
  const doohLine = draft.doohTrendKo.slice(0, 5).join(" / ");
  return [
    `제목: ${draft.titleKo}`,
    draft.titleEn ? `Title (EN): ${draft.titleEn}` : null,
    `요약: ${summaryLine}`,
    `시장 트렌드: ${marketLine}`,
    `DOOH 트렌드: ${doohLine}`,
    `---본문---`,
    draft.contentKo.slice(0, 6000), // 검증용 길이 제한 (Claude context 보호)
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 결과 정합성 보정 (모델이 가끔 sum 안 맞춰서 응답).
 * - totalScore 가 scores 합과 다르면 합으로 강제
 * - critical 이슈 있으면 verdict 강제 fail
 * - shouldPublish/requiresHumanReview 기본값 보정
 */
function normalizeResult(
  raw: ValidatorToolInput,
  modelUsed: string,
): ValidationResult {
  const scoresSum =
    (raw.scores.factual ?? 0) +
    (raw.scores.legal ?? 0) +
    (raw.scores.tone ?? 0) +
    (raw.scores.seo ?? 0);
  const totalScore = Math.max(0, Math.min(100, Math.round(scoresSum)));

  const hasCritical = raw.issues.some((i) => i.severity === "critical");
  const hasWarning = raw.issues.some((i) => i.severity === "warning");

  let verdict: ValidationVerdict;
  if (hasCritical || totalScore < 60) verdict = "fail";
  else if (hasWarning || totalScore < 80) verdict = "warning";
  else verdict = "pass";

  return {
    totalScore,
    verdict,
    scores: {
      factual: Math.max(0, Math.min(25, Math.round(raw.scores.factual ?? 0))),
      legal: Math.max(0, Math.min(25, Math.round(raw.scores.legal ?? 0))),
      tone: Math.max(0, Math.min(25, Math.round(raw.scores.tone ?? 0))),
      seo: Math.max(0, Math.min(25, Math.round(raw.scores.seo ?? 0))),
    },
    issues: raw.issues.slice(0, 20), // 폭주 방지
    shouldPublish: verdict !== "fail",
    requiresHumanReview: verdict !== "pass",
    modelUsed,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * draft + sources 를 검증해 ValidationResult 반환.
 * Anthropic 호출 실패 시 throw — caller 가 catch 해서 status="draft" 유지 결정.
 */
export async function validateTrendReport(
  draft: TrendReport,
  sources: WebSource[],
): Promise<ValidationResult> {
  const model = resolveModel();
  const client = getAnthropicClient();

  const userPrompt = `다음 트렌드 리포트 초안을 [출처 자료]와 비교해 4축 검증하세요.

[초안]
${buildDraftBlock(draft)}

[출처 자료]
${buildSourcesBlock(sources)}

emit_validation_result 도구로 응답.`;

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [validatorTool()],
    tool_choice: { type: "tool", name: VALIDATOR_TOOL },
    messages: [{ role: "user", content: userPrompt }],
  });

  let raw: ValidatorToolInput | null = null;
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === VALIDATOR_TOOL) {
      raw = block.input as ValidatorToolInput;
      break;
    }
  }
  if (!raw) {
    throw new Error(
      `Validator did not return tool "${VALIDATOR_TOOL}" — Anthropic response shape changed?`,
    );
  }

  return normalizeResult(raw, model);
}
