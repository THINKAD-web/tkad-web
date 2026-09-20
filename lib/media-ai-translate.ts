import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai-models";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { recordAiUsage } from "@/lib/ai-usage-log";
import { getPrisma } from "@/lib/prisma";

const TOOL = "emit_media_translations" as const;

type MediaTranslationLangInput = {
  name: string;
  description?: string | null;
  location?: string | null;
};

type MediaTranslationsToolInput = {
  en: MediaTranslationLangInput;
  ja: MediaTranslationLangInput;
  zh: MediaTranslationLangInput;
};

function langFieldSchema(): Anthropic.Tool.InputSchema["properties"] {
  return {
    name: { type: "string", description: "Concise media name for catalog cards" },
    description: { type: "string", description: "1–3 sentence description for advertisers" },
    location: { type: "string", description: "Location line (address or area)" },
  } as Anthropic.Tool.InputSchema["properties"];
}

function translationTool(): Anthropic.Tool {
  return {
    name: TOOL,
    description:
      "English/Japanese/Simplified-Chinese catalog fields for an OOH/DOOH media listing in THINKAD.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["en", "ja", "zh"],
      properties: {
        en: {
          type: "object",
          required: ["name"],
          properties: langFieldSchema(),
        },
        ja: {
          type: "object",
          required: ["name"],
          properties: langFieldSchema(),
        },
        zh: {
          type: "object",
          required: ["name"],
          properties: langFieldSchema(),
        },
      },
    },
  };
}

function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as T;
    }
  }
  throw new Error(`Model did not return tool "${toolName}".`);
}

const SYSTEM = `You translate Korean OOH/DOOH (out-of-home / digital-out-of-home) media catalog fields into English, Japanese, and Simplified Chinese for THINKAD, a Korean OOH ad marketplace. The audience for every language is professional media buyers evaluating an ad placement — write concise marketing copy, not literal word-for-word translation.

Domain context: fields describe a physical ad placement (billboard, digital signage, transit media, etc.) — name, a short description (specs/format if present), and a location line (address or area).

Per-language rules:
- en.name: short title case or proper nouns (e.g. "Shibuya Vision Digital Billboard").
- en.description: factual, 1–3 sentences; keep specs (size, format) if present in source.
- en.location: romanized or standard English address/area; for Japan use common English place names.
- ja: natural, professional Japanese for media buyers. Use katakana for foreign (non-Japanese, non-Korean) brand/proper names. For Korean place names, use the standard Japanese reading (e.g. 강남 → 江南（カンナム）) — kanji with katakana reading on first mention if the place is not widely known in Japan, plain kanji/katakana otherwise.
- zh: Simplified Chinese (zh-Hans / zh-CN), natural professional tone. For Korean place names, prefer the established hanja-based Chinese place name (e.g. 강남 → 江南, 홍대 → 弘大, 명동 → 明洞) over phonetic pinyin transliteration — these are the names Chinese-speaking visitors/marketers already recognize. For non-Korean foreign brand names, keep the common Chinese commercial name if one is well established, otherwise a phonetic transliteration.
- Every language's location field must describe the same real place — do not invent a different area.
- Do not invent pricing, footfall numbers, or claims not in the source.
- If the Korean source has no description, omit description in every language rather than fabricating one.
- Call emit_media_translations exactly once, with en, ja, and zh all populated.`;

export type GenerateMediaTranslationsInput = {
  name: string;
  description?: string | null;
  location: string;
  country?: string | null;
};

export type MediaTranslationLangResult = {
  name: string;
  description: string | null;
  location: string | null;
};

export type GenerateMediaTranslationsResult = {
  en: MediaTranslationLangResult;
  ja: MediaTranslationLangResult;
  zh: MediaTranslationLangResult;
  model: string;
  /** For calibrating batch-job cost estimates (PR2-b dry-run). */
  usage: { inputTokens: number; outputTokens: number };
};

function normalizeLangResult(raw: MediaTranslationLangInput | undefined): MediaTranslationLangResult {
  return {
    name: String(raw?.name ?? "").trim(),
    description: raw?.description?.trim() || null,
    location: raw?.location?.trim() || null,
  };
}

/**
 * Single Claude call generates en/ja/zh(-Hans) together — cheaper and faster than
 * three separate calls, and keeps the three translations mutually consistent
 * (same place, same specs) since the model sees them side by side.
 */
export async function generateMediaTranslations(
  input: GenerateMediaTranslationsInput,
): Promise<GenerateMediaTranslationsResult> {
  const name = input.name.trim();
  const location = input.location.trim();
  if (!name || !location) {
    throw new Error("name and location are required for translation.");
  }

  const model =
    process.env.MEDIA_AI_TRANSLATE_MODEL?.trim() || AI_MODELS.contentGen;
  const client = getAnthropicClient();

  const user = [
    "## Source (Korean)",
    `name: ${name}`,
    `location: ${location}`,
    input.description?.trim()
      ? `description: ${input.description.trim()}`
      : "description: (none)",
    input.country?.trim() ? `country: ${input.country.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM,
    tools: [translationTool()],
    tool_choice: { type: "tool", name: TOOL },
    messages: [{ role: "user", content: user }],
  });

  const inputTokens = message.usage?.input_tokens ?? 0;
  const outputTokens = message.usage?.output_tokens ?? 0;

  void recordAiUsage({
    feature: "media_translate_en_ja_zh",
    model,
    inputTokens,
    outputTokens,
  });

  const raw = extractToolInput<MediaTranslationsToolInput>(message, TOOL);

  return {
    en: normalizeLangResult(raw.en),
    ja: normalizeLangResult(raw.ja),
    zh: normalizeLangResult(raw.zh),
    model,
    usage: { inputTokens, outputTokens },
  };
}

/**
 * Upserts the ja/zh halves of a translation result into `MediaTranslation`
 * (source: "ai" — draft, not yet human-reviewed). en/ko are not written here;
 * they stay on the existing `Media` columns per the Option C storage design.
 */
export async function upsertMediaTranslationDrafts(
  mediaId: string,
  result: Pick<GenerateMediaTranslationsResult, "ja" | "zh">,
): Promise<void> {
  const prisma = getPrisma();
  const mediaTranslation = prisma.mediaTranslation;
  if (!mediaTranslation) {
    throw new Error(
      "Prisma client has no mediaTranslation delegate. Run `npx prisma generate`, then retry (restart the process if a dev server already cached an old client).",
    );
  }
  const entries: { locale: "ja" | "zh"; value: MediaTranslationLangResult }[] = [
    { locale: "ja", value: result.ja },
    { locale: "zh", value: result.zh },
  ];

  for (const { locale, value } of entries) {
    await mediaTranslation.upsert({
      where: { mediaId_locale: { mediaId, locale } },
      create: {
        mediaId,
        locale,
        name: value.name || null,
        description: value.description,
        location: value.location,
        source: "ai",
      },
      update: {
        name: value.name || null,
        description: value.description,
        location: value.location,
        source: "ai",
      },
    });
  }
}
