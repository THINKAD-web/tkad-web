import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai-models";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { logAiUsage, recordAiUsage } from "@/lib/ai-usage-log";
import { heuristicParseRfpBrief } from "@/lib/rfp-proposal/heuristic-parse";
import { normalizeRfpProposalBrief } from "@/lib/rfp-proposal/normalize";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";

const TOOL_NAME = "emit_rfp_proposal_brief" as const;
const MAX_INPUT_CHARS = 50_000;

export type ParseRfpBriefOptions = {
  locale?: "ko" | "en";
  /** true면 Claude 없이 휴리스틱만 (테스트/오프라인) */
  heuristicOnly?: boolean;
  /** Claude 실패 시 휴리스틱 폴백 (기본 true) */
  allowHeuristicFallback?: boolean;
};

export type ParseRfpBriefResult = {
  brief: RfpProposalBrief;
  source: "claude" | "heuristic";
};

function rfpTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Structure a long B2B OOH RFP email/body into region groups and shared campaign meta. " +
      "Preserve original group labels from the source. Do not invent groups that are not present. " +
      "Put location names in regionKeywords and media formats in mediaTypeKeywords. " +
      "Capture shared target/period/brand outside groups under campaign.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["groups"],
      properties: {
        campaign: {
          type: "object",
          additionalProperties: false,
          properties: {
            brandName: { type: "string", description: "Brand name if stated" },
            target: {
              type: "string",
              description: "Audience / target description if stated",
            },
            period: {
              type: "string",
              description: "Campaign timing if stated (e.g. 2026 하반기)",
            },
            industry: { type: "string", description: "Industry if stated" },
            notes: {
              type: "array",
              items: { type: "string" },
              description: "Cross-group shared requests",
            },
          },
        },
        groups: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "regionKeywords", "mediaTypeKeywords"],
            properties: {
              id: {
                type: "string",
                description: "Stable short id (optional; derived from label if omitted)",
              },
              label: {
                type: "string",
                description:
                  'Original group title from the RFP, e.g. "공항 권역", "핵심 상권"',
              },
              regionKeywords: {
                type: "array",
                items: { type: "string" },
                description:
                  "Locations / venues named in this group (인천공항 T1, 코엑스 K-POP광장, etc.)",
              },
              mediaTypeKeywords: {
                type: "array",
                items: { type: "string" },
                description:
                  "Media formats (PSD, DOOH, 디지털 사이니지, 와이드칼라, etc.)",
              },
              budget: {
                type: "string",
                description: "Group-specific budget if stated; omit if unknown",
              },
              period: {
                type: "string",
                description: "Group-specific period if stated; omit if unknown",
              },
              constraints: {
                type: "array",
                items: { type: "string" },
                description: "Contract/TO/pricing constraints for the group",
              },
              packageHints: {
                type: "array",
                items: { type: "string" },
                description: "Package recommendations mentioned for the group",
              },
            },
          },
        },
      },
    },
  };
}

async function parseWithClaude(
  text: string,
  isKo: boolean,
): Promise<RfpProposalBrief | null> {
  const client = getAnthropicClient();
  const model = AI_MODELS.contentGen;

  const system = isKo
    ? [
        "당신은 OOH(옥외광고) B2B RFP 구조화 분석가입니다.",
        "장문 이메일/RFP에서 권역·매체 그룹을 분리해 emit_rfp_proposal_brief 도구로만 출력하세요.",
        "그룹 label은 원문 제목을 유지하세요(예: 공항 권역, 핵심 상권, 지하철 역사).",
        "각 그룹의 세부 위치(인천공항 T1/T2, 코엑스 K-POP광장, PSD 등)를 regionKeywords/mediaTypeKeywords에 빠짐없이 넣으세요.",
        "타겟·시기·브랜드 등 그룹 공통 정보는 campaign에 넣으세요.",
        "원문에 없는 그룹·장소를 만들지 마세요.",
      ].join(" ")
    : [
        "You are an OOH B2B RFP structuring analyst.",
        "Split the long RFP into region/media groups and respond only via emit_rfp_proposal_brief.",
        "Keep original group labels. Capture venue details in keywords. Put shared target/period under campaign.",
        "Do not invent groups or locations not present in the source.",
      ].join(" ");

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system,
    tools: [rfpTool()],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: text.slice(0, MAX_INPUT_CHARS) }],
  });

  void logAiUsage({
    type: "rfp_parse",
    model,
    tokensUsed:
      (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
    note: "rfp proposal brief parse",
  });
  void recordAiUsage({
    feature: "content",
    model,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  });

  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === TOOL_NAME) {
      return normalizeRfpProposalBrief(block.input);
    }
  }
  return null;
}

/**
 * 장문 RFP → 그룹 구조화 브리프.
 * 기본: Claude 구조화 추출 → 실패 시 휴리스틱 폴백.
 */
export async function parseRfpProposalBrief(
  text: string,
  options: ParseRfpBriefOptions = {},
): Promise<ParseRfpBriefResult> {
  const trimmed = text.trim();
  if (trimmed.length < 40) {
    throw new Error("RFP text too short");
  }

  const isKo = options.locale !== "en";
  const allowFallback = options.allowHeuristicFallback !== false;

  if (options.heuristicOnly) {
    const brief = heuristicParseRfpBrief(trimmed);
    if (!brief) throw new Error("Heuristic RFP parse failed");
    return { brief, source: "heuristic" };
  }

  try {
    const brief = await parseWithClaude(trimmed, isKo);
    if (brief) return { brief, source: "claude" };
  } catch (e) {
    if (!allowFallback) throw e;
    console.warn("[rfp-proposal] Claude parse failed, using heuristic", e);
  }

  if (!allowFallback) {
    throw new Error("Claude RFP parse returned empty");
  }

  const brief = heuristicParseRfpBrief(trimmed);
  if (!brief) throw new Error("RFP parse failed");
  return { brief, source: "heuristic" };
}
