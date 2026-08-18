import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai-models";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { recordAiUsage } from "@/lib/ai-usage-log";

const TOOL = "emit_media_en_translation" as const;

type MediaEnTranslationInput = {
  nameEn: string;
  descriptionEn?: string | null;
  locationEn?: string | null;
};

function translationTool(): Anthropic.Tool {
  return {
    name: TOOL,
    description:
      "English catalog fields for an OOH/DOOH media listing in THINKAD.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["nameEn"],
      properties: {
        nameEn: {
          type: "string",
          description: "Concise English media name for catalog cards",
        },
        descriptionEn: {
          type: "string",
          description: "1–3 sentence English description for advertisers",
        },
        locationEn: {
          type: "string",
          description: "English location line (address or area, no Korean)",
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

const SYSTEM = `You translate Korean OOH/DOOH media catalog fields into natural English for THINKAD (Korean out-of-home ad marketplace).

Rules:
- Output professional marketing English suitable for media buyers.
- nameEn: short title case or proper nouns (e.g. "Shibuya Vision Digital Billboard").
- descriptionEn: factual, 1–3 sentences; keep specs (size, format) if present in source.
- locationEn: romanized or standard English address/area; for Japan use common English place names.
- Do not invent pricing, footfall numbers, or claims not in the source.
- Call emit_media_en_translation exactly once.`;

export type GenerateMediaEnTranslationInput = {
  name: string;
  description?: string | null;
  location: string;
  country?: string | null;
};

export type GenerateMediaEnTranslationResult = {
  nameEn: string;
  descriptionEn: string | null;
  locationEn: string | null;
  model: string;
};

export async function generateMediaEnTranslation(
  input: GenerateMediaEnTranslationInput,
): Promise<GenerateMediaEnTranslationResult> {
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

  void recordAiUsage({
    feature: "media_en_translate",
    model,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  });

  const raw = extractToolInput<MediaEnTranslationInput>(message, TOOL);

  return {
    nameEn: String(raw.nameEn ?? "").trim(),
    descriptionEn: raw.descriptionEn?.trim() || null,
    locationEn: raw.locationEn?.trim() || null,
    model,
  };
}
