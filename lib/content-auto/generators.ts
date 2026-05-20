import Anthropic from "@anthropic-ai/sdk";
import {
  getAnthropicClient,
  resolveModel,
} from "@/lib/ai-content-generator";
import { withOohExpertContext } from "@/lib/ai-ooh-expert";
import {
  EDUCATION_WRITER_SYSTEM,
  GUIDE_WRITER_SYSTEM,
  TREND_ANALYST_SYSTEM,
} from "@/lib/content-auto/prompts";

const ARTICLE_TOOL = "emit_marketing_article" as const;

export type MarketingArticleDraft = {
  titleKo: string;
  titleEn?: string | null;
  excerptKo: string;
  contentKo: string;
};

function articleTool(): Anthropic.Tool {
  return {
    name: ARTICLE_TOOL,
    description:
      "Submit a completed Korean marketing article as structured fields. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        titleKo: { type: "string", description: "Korean title" },
        titleEn: { type: "string", description: "Optional English title" },
        excerptKo: {
          type: "string",
          description: "2–3 sentence intro / hook (Korean)",
        },
        contentKo: {
          type: "string",
          description: "Full Markdown body (Korean)",
        },
      },
      required: ["titleKo", "excerptKo", "contentKo"],
    },
  };
}

function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as T;
    }
  }
  throw new Error(`Model did not return tool "${toolName}".`);
}

async function generateArticle(opts: {
  system: string;
  user: string;
  logType: string;
}): Promise<MarketingArticleDraft> {
  const model = resolveModel();
  const client = getAnthropicClient();
  const system = withOohExpertContext(opts.system);

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    tools: [articleTool()],
    tool_choice: { type: "tool", name: ARTICLE_TOOL },
    messages: [{ role: "user", content: opts.user }],
  });

  const raw = extractToolInput<MarketingArticleDraft>(message, ARTICLE_TOOL);
  return {
    titleKo: raw.titleKo.trim(),
    titleEn: raw.titleEn?.trim() || null,
    excerptKo: raw.excerptKo.trim(),
    contentKo: raw.contentKo.trim(),
  };
}

export async function generateEducationArticle(
  topicTitle: string,
): Promise<MarketingArticleDraft> {
  return generateArticle({
    system: EDUCATION_WRITER_SYSTEM,
    user: `주제: 「${topicTitle}」

위 주제로 교육 콘텐츠 1편을 작성하세요. emit_marketing_article tool 로 제출하세요.`,
    logType: "education_article",
  });
}

export async function generateGuideArticle(
  topicTitle: string,
): Promise<MarketingArticleDraft> {
  return generateArticle({
    system: GUIDE_WRITER_SYSTEM,
    user: `주제: 「${topicTitle}」

위 주제로 광고주 OOH 가이드 1편을 작성하세요. emit_marketing_article tool 로 제출하세요.`,
    logType: "guide_article",
  });
}

/** 트렌드 리포트용 추가 시스템 지시 (기존 emit_trend_report 와 병행) */
export function trendAnalystSystemOverlay(month: string): string {
  return `${TREND_ANALYST_SYSTEM}

대상 기간: ${month} (한국 시장 기준).
Output: 기존 emit_trend_report tool 규격을 따르되, 위 형식·톤을 반영하세요.`;
}
