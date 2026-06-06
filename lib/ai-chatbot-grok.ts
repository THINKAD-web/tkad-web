import type { MediaItem } from "@/lib/media-data";
import {
  executeChatbotTool,
  getAiChatbotTools,
  type AiChatbotMediaCard,
  type AiChatbotToolSpec,
} from "@/lib/ai-chatbot-tools";

const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";

function chatbotToolsToOpenAi(tools: AiChatbotToolSpec[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

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

type GrokToolCall = {
  id: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type GrokMessage = Record<string, unknown>;

function extractTextContent(msg: GrokMessage): string {
  const c = msg.content;
  if (typeof c === "string") return c.trim();
  if (!Array.isArray(c)) return "";
  const parts: string[] = [];
  for (const block of c) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "text" &&
      typeof (block as { text?: string }).text === "string"
    ) {
      parts.push((block as { text: string }).text);
    }
  }
  return parts.join("\n").trim();
}

/**
 * xAI Grok Chat Completions (OpenAI 호환). `XAI_API_KEY` 필수.
 */
export async function completeGrokChatbot(params: {
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
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set");
  }

  const model = process.env.XAI_MODEL?.trim() || "grok-3";
  const maxTokensRaw = process.env.XAI_MAX_TOKENS?.trim();
  const max_tokens = maxTokensRaw
    ? Math.min(8192, Math.max(256, parseInt(maxTokensRaw, 10) || 1000))
    : 1000;

  const tools = chatbotToolsToOpenAi(getAiChatbotTools());
  const openAiMessages: GrokMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const collectedCards: AiChatbotMediaCard[] = [];
  const maxRounds = params.maxToolRounds ?? 5;
  let totalTokens = 0;

  for (let round = 0; round < maxRounds; round++) {
    const response = await fetch(XAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: openAiMessages,
        tools,
        tool_choice: "auto",
        max_tokens,
      }),
    });

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new Error("xAI API: invalid JSON response");
    }

    if (!response.ok) {
      const errObj = raw as { error?: { message?: string } };
      const errMsg =
        typeof errObj?.error?.message === "string"
          ? errObj.error.message
          : response.statusText;
      throw new Error(`xAI API error: ${errMsg}`);
    }

    const data = raw as {
      choices?: Array<{ message?: GrokMessage; finish_reason?: string }>;
      usage?: { total_tokens?: number };
    };
    totalTokens += data.usage?.total_tokens ?? 0;
    const choice = data.choices?.[0];
    const msg = choice?.message;
    if (!msg || typeof msg !== "object") {
      throw new Error("xAI API: empty choices");
    }

    const toolCalls = msg.tool_calls as GrokToolCall[] | undefined;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      openAiMessages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        if (!tc?.id || !tc.function?.name) {
          continue;
        }
        let input: unknown = {};
        try {
          const args = tc.function.arguments;
          input = args && String(args).trim() ? JSON.parse(String(args)) : {};
        } catch {
          input = {};
        }
        const { result, cards } = executeChatbotTool(
          tc.function.name,
          input,
          params.catalog,
        );
        collectedCards.push(...cards);
        openAiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    const reply = extractTextContent(msg) || "…";
    return {
      reply,
      media: dedupeMediaCards(collectedCards).slice(0, 6),
      tokensUsed: totalTokens,
      model,
    };
  }

  return {
    reply:
      params.locale === "ko"
        ? "도구 호출이 너무 많이 이어졌습니다. 질문을 짧게 나누어 다시 시도해 주세요."
        : "Too many tool steps. Please try a shorter question.",
    media: dedupeMediaCards(collectedCards).slice(0, 6),
    tokensUsed: totalTokens,
    model,
  };
}
