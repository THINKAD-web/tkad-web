import Anthropic from "@anthropic-ai/sdk";

/** Admin content-seed endpoints use this snapshot unless ANTHROPIC_MODEL is set. */
export const SEED_CLAUDE_MODEL = "claude-sonnet-4-20250514";

const SEED_DELAY_MS = 1000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSeedAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to generate content.",
    );
  }
  return new Anthropic({ apiKey: key });
}

export function resolveSeedModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || SEED_CLAUDE_MODEL;
}

/**
 * Plain-text Claude generation for admin seed batches.
 */
export async function generateSeedText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const client = getSeedAnthropicClient();
  const model = resolveSeedModel();
  const message = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude returned empty text.");
  }
  return text;
}

export async function withSeedDelay<T>(
  index: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (index > 0) await sleep(SEED_DELAY_MS);
  return fn();
}
