import { NextResponse } from "next/server";
import { buildAiChatbotSystemPromptWithTools } from "@/lib/ai-chatbot-system";
import { completeGrokChatbot } from "@/lib/ai-chatbot-grok";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const maxDuration = 60;

type ChatRole = "user" | "assistant";

type HistoryItem = { role: ChatRole; content: string };

type ChatTurn = { role: "user" | "assistant"; content: string };

const MAX_MESSAGE_CHARS = 2_500;
const MAX_HISTORY = 16;
const MAX_CONTENT_STRIP = 12_000;

function normalizeMessages(
  message: string,
  history: unknown,
): { ok: true; messages: ChatTurn[] } | { ok: false; error: string } {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "message required" };
  if (trimmed.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: "message too long" };
  }

  let prev: ChatRole | null = null;
  const out: ChatTurn[] = [];

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

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    catalog = [];
  }

  const system = buildAiChatbotSystemPromptWithTools(locale);

  try {
    const { reply, media } = await completeGrokChatbot({
      systemPrompt: system,
      messages: normalized.messages,
      catalog,
      locale,
    });
    return NextResponse.json({ reply, media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("XAI_API_KEY")) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 },
      );
    }
    console.error("[api/chat]", msg);
    return NextResponse.json(
      { error: "Failed to get AI response. Try again later." },
      { status: 502 },
    );
  }
}
