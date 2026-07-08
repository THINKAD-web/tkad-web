import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import {
  SUPPORT_CHAT_SESSION_KEY,
  loadSupportChatFromSession,
} from "@/lib/support-chat-storage";

export const AI_CHATBOT_SESSION_KEY = "tkad-ai-chatbot-v2";

const AI_CHATBOT_SESSION_ID_KEY = "tkad-ai-chatbot-session-id";

export type AiChatTurn = {
  role: "user" | "assistant";
  content: string;
  media?: AiChatbotMediaCard[];
  recommendDeeplink?: string | null;
  plannerDeeplink?: string | null;
};

export function getOrCreateAiChatSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(AI_CHATBOT_SESSION_ID_KEY);
    if (!id) {
      id = sessionStorage.getItem("tkad-support-chat-session-id");
    }
    if (!id) {
      id = `cb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    sessionStorage.setItem(AI_CHATBOT_SESSION_ID_KEY, id);
    sessionStorage.setItem("tkad-support-chat-session-id", id);
    return id;
  } catch {
    return `cb_${Date.now()}`;
  }
}

function parseTurns(raw: unknown): AiChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is AiChatTurn =>
        !!m &&
        typeof m === "object" &&
        ((m as AiChatTurn).role === "user" ||
          (m as AiChatTurn).role === "assistant") &&
        typeof (m as AiChatTurn).content === "string",
    )
    .map((m) => ({
      role: m.role,
      content: m.content,
      media:
        m.role === "assistant" && Array.isArray(m.media)
          ? m.media.filter(
              (c): c is AiChatbotMediaCard =>
                !!c && typeof c === "object" && typeof c.id === "string",
            )
          : undefined,
      recommendDeeplink:
        m.role === "assistant" && typeof m.recommendDeeplink === "string"
          ? m.recommendDeeplink
          : undefined,
      plannerDeeplink:
        m.role === "assistant" && typeof m.plannerDeeplink === "string"
          ? m.plannerDeeplink
          : undefined,
    }))
    .slice(-24);
}

/** v2 storage with optional media; migrates text-only v1 on first read. */
export function loadAiChatFromSession(): AiChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const v2 = sessionStorage.getItem(AI_CHATBOT_SESSION_KEY);
    if (v2) return parseTurns(JSON.parse(v2));

    const legacy = loadSupportChatFromSession();
    if (legacy.length > 0) {
      const migrated: AiChatTurn[] = legacy.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      saveAiChatToSession(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAiChatToSession(messages: AiChatTurn[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      AI_CHATBOT_SESSION_KEY,
      JSON.stringify(messages.slice(-24)),
    );
    // Drop legacy v1 once v2 is active
    sessionStorage.removeItem(SUPPORT_CHAT_SESSION_KEY);
  } catch {
    /* quota */
  }
}
