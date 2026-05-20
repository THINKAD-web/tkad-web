import { NextResponse } from "next/server";
import { completeSupportChat, type SupportChatTurn } from "@/lib/support-chat-complete";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

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

async function persistChatLogs(
  userId: string,
  locale: string,
  userContent: string,
  assistantContent: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  await db.$transaction([
    db.chatLog.create({
      data: { userId, locale, role: "user", content: userContent },
    }),
    db.chatLog.create({
      data: { userId, locale, role: "assistant", content: assistantContent },
    }),
  ]);
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

  const userMessage =
    normalized.messages[normalized.messages.length - 1]?.content ?? "";

  try {
    const reply = await completeSupportChat({
      locale,
      messages: normalized.messages,
    });

    const session = await getCurrentUser();
    if (session?.id && userMessage && reply) {
      void persistChatLogs(session.id, locale, userMessage, reply).catch(() => {
        /* optional persistence */
      });
    }

    return NextResponse.json({ reply });
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
