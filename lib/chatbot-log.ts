import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type ChatbotTurnLogInput = {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  pageUrl?: string | null;
  locale: string;
  model?: string | null;
  userMessage: string;
  assistantMessage: string;
  tokensUsed?: number | null;
};

const MAX_MSG = 8000;
const MAX_META = 512;

/** 공개 AI 챗봇 한 턴(user+assistant)을 기록. 실패해도 응답 흐름을 막지 않음. */
export async function logChatbotTurn(input: ChatbotTurnLogInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const sessionId = input.sessionId?.trim();
  if (!sessionId) return;

  const shared = {
    sessionId,
    userId: input.userId ?? null,
    userName: input.userName ?? null,
    userEmail: input.userEmail ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent?.slice(0, MAX_META) ?? null,
    pageUrl: input.pageUrl?.slice(0, MAX_META) ?? null,
    locale: input.locale || "ko",
    model: input.model ?? null,
  };

  try {
    const db = getPrisma();
    await db.chatbotLog.createMany({
      data: [
        {
          ...shared,
          role: "user",
          message: input.userMessage.slice(0, MAX_MSG),
        },
        {
          ...shared,
          role: "assistant",
          message: input.assistantMessage.slice(0, MAX_MSG),
          tokensUsed: input.tokensUsed ?? null,
        },
      ],
    });
  } catch (e) {
    console.error("[chatbot-log]", e instanceof Error ? e.message : e);
  }
}
