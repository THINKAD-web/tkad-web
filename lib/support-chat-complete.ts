import {
  getAnthropicClient,
  resolveModel,
} from "@/lib/ai-content-generator";
import { buildSupportChatSystemPrompt } from "@/lib/support-chat-prompt";

export type SupportChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_OUTPUT_TOKENS = 900;

export async function completeSupportChat(params: {
  locale: "ko" | "en";
  messages: SupportChatTurn[];
  afterHours?: boolean;
}): Promise<string> {
  const client = getAnthropicClient();
  const system = buildSupportChatSystemPrompt(params.locale, {
    afterHours: params.afterHours,
  });

  const response = await client.messages.create({
    model: resolveModel(),
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages: params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  return text || (params.locale === "en" ? "Please try again." : "다시 시도해 주세요.");
}
