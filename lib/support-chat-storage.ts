import type { SupportChatTurn } from "@/lib/support-chat-complete";

export const SUPPORT_CHAT_SESSION_KEY = "tkad-support-chat-v1";

export function loadSupportChatFromSession(): SupportChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SUPPORT_CHAT_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is SupportChatTurn =>
          !!m &&
          typeof m === "object" &&
          (m as SupportChatTurn).role !== undefined &&
          typeof (m as SupportChatTurn).content === "string",
      )
      .slice(-24);
  } catch {
    return [];
  }
}

export function saveSupportChatToSession(messages: SupportChatTurn[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SUPPORT_CHAT_SESSION_KEY,
      JSON.stringify(messages.slice(-24)),
    );
  } catch {
    /* quota */
  }
}

export function clearSupportChatSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SUPPORT_CHAT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
