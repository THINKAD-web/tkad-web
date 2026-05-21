import { NextResponse } from "next/server";
import { completeSupportChat, type SupportChatTurn } from "@/lib/support-chat-complete";
import { getSupportHoursStatus } from "@/lib/support-chat-hours";
import { persistSupportChatTurn } from "@/lib/support-chat-persist";
import { getCurrentUser } from "@/lib/user-session";

export const maxDuration = 45;

const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY = 14;

function normalizeMessages(
  message: string,
  history: unknown,
): { ok: true; messages: SupportChatTurn[] } | { ok: false; error: string } {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "message required" };
  if (trimmed.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: "message too long" };
  }

  let prev: SupportChatTurn["role"] | null = null;
  const out: SupportChatTurn[] = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-MAX_HISTORY)) {
      if (!item || typeof item !== "object") continue;
      const role = (item as SupportChatTurn).role;
      const content = String((item as SupportChatTurn).content ?? "").trim();
      if (role !== "user" && role !== "assistant") continue;
      if (!content) continue;
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

  const { message, history, locale: localeRaw, sessionId: sessionIdRaw } = body as {
    message?: unknown;
    history?: unknown;
    locale?: unknown;
    sessionId?: unknown;
  };

  const locale = localeRaw === "en" ? "en" : "ko";
  const sessionId =
    typeof sessionIdRaw === "string" && sessionIdRaw.length >= 8
      ? sessionIdRaw.slice(0, 64)
      : `anon_${Date.now()}`;
  const hours = getSupportHoursStatus();
  const normalized = normalizeMessages(String(message ?? ""), history);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const userMessage =
    normalized.messages[normalized.messages.length - 1]?.content ?? "";

  try {
    const reply = await completeSupportChat({
      locale,
      messages: normalized.messages,
      afterHours: !hours.isOpen,
    });

    const user = await getCurrentUser();
    if (userMessage && reply) {
      void persistSupportChatTurn({
        sessionId: user?.id ? `user_${user.id}` : sessionId,
        userId: user?.id ?? null,
        locale,
        userContent: userMessage,
        assistantContent: reply,
      }).catch(() => {});
    }

    return NextResponse.json({
      reply,
      mode: hours.isOpen ? "business_hours" : "ai_after_hours",
      hoursOpen: hours.isOpen,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "AI is not configured on this server."
              : "AI가 설정되지 않았습니다.",
        },
        { status: 503 },
      );
    }
    console.error("[support-chat]", msg);
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Could not get a response. Please try again."
            : "응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
