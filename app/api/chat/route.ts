import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { getAnthropicClient, resolveModel } from "@/lib/ai-content-generator";
import { buildAiChatbotSystemPromptWithTools } from "@/lib/ai-chatbot-system";
import {
  executeChatbotTool,
  getAiChatbotTools,
  type AiChatbotMediaCard,
} from "@/lib/ai-chatbot-tools";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const maxDuration = 60;

type ChatRole = "user" | "assistant";

type HistoryItem = { role: ChatRole; content: string };

const MAX_MESSAGE_CHARS = 2_500;
const MAX_HISTORY = 16;
const MAX_CONTENT_STRIP = 12_000;
const MAX_TOOL_ROUNDS = 5;

function extractAssistantText(message: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n").trim() || "…";
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

function normalizeMessages(
  message: string,
  history: unknown,
): { ok: true; messages: MessageParam[] } | { ok: false; error: string } {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "message required" };
  if (trimmed.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: "message too long" };
  }

  let prev: ChatRole | null = null;
  const out: MessageParam[] = [];

  if (Array.isArray(history)) {
    const slice = history.slice(-MAX_HISTORY);
    for (const item of slice) {
      if (!item || typeof item !== "object") continue;
      const role = (item as HistoryItem).role;
      const content = String((item as HistoryItem).content ?? "").trim();
      if (role !== "user" && role !== "assistant") continue;
      if (!content || content.length > MAX_CONTENT_STRIP) continue;
      if (prev === role) continue;
      out.push({ role, content });
      prev = role;
    }
  }

  const tail = out[out.length - 1];
  if (tail?.role === "user") {
    tail.content = `${tail.content}\n\n${trimmed}`;
  } else {
    out.push({ role: "user", content: trimmed });
  }
  return { ok: true, messages: out };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { message, history, locale: localeRaw } = body as {
    message?: unknown;
    history?: unknown;
    locale?: unknown;
  };

  const locale = localeRaw === "en" ? "en" : "ko";

  const normalized = normalizeMessages(String(message ?? ""), history);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "AI client error" }, { status: 503 });
  }

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    catalog = [];
  }

  const system = buildAiChatbotSystemPromptWithTools(locale);
  const tools = getAiChatbotTools();

  let msgs: MessageParam[] = normalized.messages;
  const collectedCards: AiChatbotMediaCard[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: resolveModel(),
        max_tokens: 4_096,
        system,
        messages: msgs,
        tools,
      });

      if (response.stop_reason === "tool_use") {
        const toolResults: ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const { result, cards } = executeChatbotTool(
              block.name,
              block.input,
              catalog,
            );
            collectedCards.push(...cards);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }
        if (toolResults.length === 0) {
          break;
        }
        msgs = [
          ...msgs,
          {
            role: "assistant",
            content: response.content as MessageParam["content"],
          },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      const reply = extractAssistantText(response);
      const media = dedupeMediaCards(collectedCards).slice(0, 6);
      return NextResponse.json({ reply, media });
    }

    return NextResponse.json({
      reply:
        locale === "ko"
          ? "도구 호출이 너무 많이 이어졌습니다. 질문을 짧게 나누어 다시 시도해 주세요."
          : "Too many tool steps. Please try a shorter question.",
      media: dedupeMediaCards(collectedCards).slice(0, 6),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/chat]", msg);
    return NextResponse.json(
      { error: "Failed to get AI response. Try again later." },
      { status: 502 },
    );
  }
}
