import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai-models";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { logAiUsage, recordAiUsage } from "@/lib/ai-usage-log";

/**
 * AI 플래너 자유텍스트 파서 — 자유 설명에서 추천 조건(AiRecommendInput 부분집합)을 추출.
 *
 * 정책: **추측 금지.** 자유 설명에 명시되지 않은 값은 null 로 둔다.
 * (UI 확인/수정 화면에서 사용자가 직접 채우게 — 잘못된 추측으로 매칭을 돌리지 않기 위함.)
 *
 * 출력 필드는 기존 `AiRecommendInput`(lib/ai-media-recommend.ts)·`recommendInputSchema`
 * (lib/schemas/recommend.ts)와 동일한 enum/단위를 사용해 하위 매칭 파이프라인에 무수정 연결한다.
 */

export const RECOMMEND_GOALS = ["awareness", "consideration", "launch"] as const;
export const RECOMMEND_TARGETS = [
  "genz",
  "millennial",
  "family",
  "biz",
  "mass",
] as const;
export const RECOMMEND_INDUSTRIES = [
  "retail",
  "fintech",
  "fmcg",
  "auto",
  "entertainment",
  "beauty",
  "other",
] as const;

export type RecommendGoal = (typeof RECOMMEND_GOALS)[number];
export type RecommendTarget = (typeof RECOMMEND_TARGETS)[number];
export type RecommendIndustry = (typeof RECOMMEND_INDUSTRIES)[number];

/** 파서 결과 — 모든 필드 nullable(명시 안 됐으면 null). */
export type RecommendBriefFields = {
  goal: RecommendGoal | null;
  target: RecommendTarget | null;
  /** 월 예산 상한(만원). 명시 안 됐으면 null */
  budgetMaxMan: number | null;
  /** 희망 지역 자유 텍스트(서울/강남/부산/전국 등). 명시 안 됐으면 null */
  region: string | null;
  industry: RecommendIndustry | null;
};

const TOOL_NAME = "emit_campaign_brief" as const;

function briefTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Extract OOH advertising campaign brief fields from the user's free-text description. " +
      "Only include a field when it is clearly stated. If a field is not clearly stated, OMIT it entirely — never guess.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: [],
      properties: {
        goal: {
          type: "string",
          enum: [...RECOMMEND_GOALS],
          description:
            "광고 목적. awareness=브랜드 인지/노출 확대, consideration=관심·고려 유도, launch=신규 런칭/오픈/출시. 불명확하면 생략.",
        },
        target: {
          type: "string",
          enum: [...RECOMMEND_TARGETS],
          description:
            "핵심 타깃. genz=10대~20대 초반, millennial=20~30대, family=가족·40대 이상, biz=직장인/B2B, mass=불특정 다수. 불명확하면 생략.",
        },
        budgetMaxMan: {
          type: "number",
          description:
            "월 예산 상한(만원 단위 정수). 예: '월 500만원'→500, '5천만원'→5000, '1억'→10000. 불명확하면 생략.",
        },
        region: {
          type: "string",
          description:
            "희망 노출 지역 자유 텍스트(예: 서울, 강남, 홍대, 성수, 부산, 전국). 불명확하면 생략.",
        },
        industry: {
          type: "string",
          enum: [...RECOMMEND_INDUSTRIES],
          description:
            "업종. retail=리테일/유통, fintech=금융/핀테크, fmcg=생활소비재, auto=자동차, entertainment=엔터/콘텐츠, beauty=뷰티, other=기타. 불명확하면 생략.",
        },
      },
    },
  };
}

function pickEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : null;
}

function coerceFields(raw: Record<string, unknown>): RecommendBriefFields {
  const budgetRaw =
    typeof raw.budgetMaxMan === "number" ? raw.budgetMaxMan : Number(raw.budgetMaxMan);
  const budgetMaxMan =
    Number.isFinite(budgetRaw) && budgetRaw > 0
      ? Math.min(1_000_000, Math.round(budgetRaw))
      : null;
  const region =
    typeof raw.region === "string" && raw.region.trim()
      ? raw.region.trim().slice(0, 64)
      : null;
  return {
    goal: pickEnum(raw.goal, RECOMMEND_GOALS),
    target: pickEnum(raw.target, RECOMMEND_TARGETS),
    budgetMaxMan,
    region,
    industry: pickEnum(raw.industry, RECOMMEND_INDUSTRIES),
  };
}

const MAX_INPUT_CHARS = 2000;

/**
 * 자유텍스트 → 추천 조건 추출. Haiku(`AI_MODELS.recommendation`) tool-use.
 * ANTHROPIC_API_KEY 미설정 시 `getAnthropicClient()` 가 throw → 호출부에서 처리.
 */
export async function parseFreetextToBrief(
  text: string,
  isKo: boolean,
): Promise<RecommendBriefFields> {
  const client = getAnthropicClient();
  const model = AI_MODELS.recommendation;

  const system = isKo
    ? "당신은 OOH 광고 브리프 분석가입니다. 사용자의 자유 설명에서 캠페인 조건을 추출해 emit_campaign_brief 도구로만 출력하세요. 명시되지 않은 필드는 절대 추측하지 말고 생략하세요."
    : "You are an OOH advertising brief analyst. Extract campaign conditions from the user's free-text and respond only via the emit_campaign_brief tool. Never guess fields that are not clearly stated — omit them.";

  const message = await client.messages.create({
    model,
    max_tokens: 400,
    system,
    tools: [briefTool()],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: text.slice(0, MAX_INPUT_CHARS) }],
  });

  void logAiUsage({
    type: "recommendation",
    model,
    tokensUsed:
      (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
    note: "ai planner freetext parse",
  });
  void recordAiUsage({
    feature: "recommendation",
    model,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  });

  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === TOOL_NAME) {
      return coerceFields(block.input as Record<string, unknown>);
    }
  }
  // 도구 미반환 시 전부 null (사용자가 직접 채움)
  return { goal: null, target: null, budgetMaxMan: null, region: null, industry: null };
}
