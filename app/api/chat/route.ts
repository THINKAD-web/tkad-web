import { NextResponse } from "next/server";
import { completeClaudeChatbot } from "@/lib/ai-chatbot-claude";
import { completeRuleChatbot, isChatbotClaudeEnabled } from "@/lib/ai-chatbot-rule";
import { buildAiChatbotSystemPromptWithTools } from "@/lib/ai-chatbot-system";
import { recordAiUsage } from "@/lib/ai-usage-log";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getCurrentUser } from "@/lib/user-session";
import { getClientIp } from "@/lib/api-response";
import { logChatbotTurn } from "@/lib/chatbot-log";
import { getChatbotStatus } from "@/lib/chatbot-status";
import { enforceAiRateLimit, aiRateMessage } from "@/lib/ai-rate-limit";

export const maxDuration = 60;

type ChatRole = "user" | "assistant";

type HistoryItem = { role: ChatRole; content: string };

type ChatTurn = { role: "user" | "assistant"; content: string };

const MAX_MESSAGE_CHARS = 2_500;
const MAX_HISTORY = 10;
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

  const {
    message,
    history,
    locale: localeRaw,
    sessionId: sessionIdRaw,
    pageUrl: pageUrlRaw,
  } = body as {
    message?: unknown;
    history?: unknown;
    locale?: unknown;
    sessionId?: unknown;
    pageUrl?: unknown;
  };

  const locale = localeRaw === "en" ? "en" : "ko";
  const sessionId =
    typeof sessionIdRaw === "string" ? sessionIdRaw.slice(0, 64) : "";
  const pageUrl = typeof pageUrlRaw === "string" ? pageUrlRaw : null;
  const userMessage = String(message ?? "").trim();

  if ((await getChatbotStatus()) === "maintenance") {
    return NextResponse.json({
      maintenance: true,
      reply:
        locale === "ko"
          ? "🔧 챗봇이 현재 점검 중입니다. 잠시 후 다시 이용해 주세요."
          : "🔧 The chatbot is under maintenance. Please try again later.",
    });
  }

  const normalized = normalizeMessages(userMessage, history);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const user = await getCurrentUser();
  const rl = await enforceAiRateLimit(req, user?.id ?? null);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        rateLimited: true,
        reason: rl.reason,
        message: aiRateMessage(rl.reason, locale === "ko"),
        remaining: 0,
        limit: rl.limit,
      },
      { status: 429 },
    );
  }

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    catalog = [];
  }

  const useClaude = isChatbotClaudeEnabled();

  try {
    if (useClaude) {
      const system = buildAiChatbotSystemPromptWithTools(locale);
      const { reply, media, tokensUsed, inputTokens, outputTokens, model } =
        await completeClaudeChatbot({
          systemPrompt: system,
          messages: normalized.messages,
          catalog,
          locale,
        });

      void recordAiUsage({
        feature: "chatbot",
        model,
        inputTokens,
        outputTokens,
        userId: user?.id ?? null,
      });

      if (sessionId) {
        try {
          await logChatbotTurn({
            sessionId,
            userId: user?.id ?? null,
            userName: user?.name ?? null,
            userEmail: user?.email ?? null,
            ip: getClientIp(req),
            userAgent: req.headers.get("user-agent"),
            pageUrl,
            locale,
            model,
            userMessage,
            assistantMessage: reply,
            tokensUsed,
          });
        } catch (logErr) {
          console.error("[api/chat] log failed", logErr);
        }
      }

      return NextResponse.json({
        reply,
        media,
        remaining: rl.remaining,
        limit: rl.limit,
        engine: "claude",
        tokensUsed,
      });
    }

    const {
      reply,
      media,
      tokensUsed,
      inputTokens,
      outputTokens,
      model,
      plannerDeeplink,
    } = completeRuleChatbot({
      message: userMessage,
      catalog,
      locale,
    });

    if (sessionId) {
      try {
        await logChatbotTurn({
          sessionId,
          userId: user?.id ?? null,
          userName: user?.name ?? null,
          userEmail: user?.email ?? null,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
          pageUrl,
          locale,
          model,
          userMessage,
          assistantMessage: reply,
          tokensUsed,
        });
      } catch (logErr) {
        console.error("[api/chat] log failed", logErr);
      }
    }

    return NextResponse.json({
      reply,
      media,
      plannerDeeplink,
      remaining: rl.remaining,
      limit: rl.limit,
      engine: "rule",
      tokensUsed,
      inputTokens,
      outputTokens,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
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
