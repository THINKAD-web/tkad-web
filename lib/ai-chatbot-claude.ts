import type Anthropic from "@anthropic-ai/sdk";
import type { MediaItem } from "@/lib/media-data";
import {
  executeChatbotTool,
  getAiChatbotTools,
  type AiChatbotMediaCard,
} from "@/lib/ai-chatbot-tools";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { AI_MODELS } from "@/lib/ai-models";

/** 공개 챗봇 모델 — 비용 최소화를 위해 Haiku 기본 (CHATBOT_MODEL 로 override) */
export const CHATBOT_MODEL = AI_MODELS.chatbot;
const CHATBOT_MAX_TOKENS = Number(process.env.CHATBOT_MAX_TOKENS ?? "1024") || 1024;

function dedupeMediaCards(cards: AiChatbotMediaCard[]): AiChatbotMediaCard[] {
  const seen = new Set<string>();
  const out: AiChatbotMediaCard[] = [];
  for (const c of cards) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/**
 * 싱커드 공개 AI 챗봇 — Claude Haiku (tool calling: 매체 검색/추천).
 */
export async function completeClaudeChatbot(params: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  catalog: MediaItem[];
  locale: "ko" | "en";
  maxToolRounds?: number;
}): Promise<{
  reply: string;
  media: AiChatbotMediaCard[];
  tokensUsed: number;
  model: string;
}> {
  const client = getAnthropicClient(); // ANTHROPIC_API_KEY 없으면 throw

  const tools = getAiChatbotTools().map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  const messages: Anthropic.MessageParam[] = params.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const collectedCards: AiChatbotMediaCard[] = [];
  let totalTokens = 0;
  const maxRounds = params.maxToolRounds ?? 4;

  for (let round = 0; round < maxRounds; round++) {
    const res = await client.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: CHATBOT_MAX_TOKENS,
      system: params.systemPrompt,
      tools,
      messages,
    });
    totalTokens +=
      (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);

    if (res.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: res.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        const { result, cards } = executeChatbotTool(
          block.name,
          block.input,
          params.catalog,
        );
        collectedCards.push(...cards);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const reply =
      res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || "…";
    return {
      reply,
      media: dedupeMediaCards(collectedCards).slice(0, 6),
      tokensUsed: totalTokens,
      model: CHATBOT_MODEL,
    };
  }

  return {
    reply:
      params.locale === "ko"
        ? "도구 호출이 너무 많이 이어졌습니다. 질문을 짧게 나누어 다시 시도해 주세요."
        : "Too many tool steps. Please try a shorter question.",
    media: dedupeMediaCards(collectedCards).slice(0, 6),
    tokensUsed: totalTokens,
    model: CHATBOT_MODEL,
  };
}
