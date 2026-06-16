import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai-models";
import { getAnthropicClient } from "@/lib/ai-content-generator";
import { recordAiUsage } from "@/lib/ai-usage-log";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
} from "@/lib/media-network-types";
import {
  parseNetworkQuickAddJson,
  type NetworkQuickAddParsed,
} from "@/lib/network-quick-add";

const TOOL = "emit_network_quick_add" as const;

type NetworkDraftToolInput = {
  name: string;
  nameEn?: string | null;
  type: string;
  description?: string | null;
  minUnits?: number | null;
  pricePerUnit?: number | null;
  pricePackage?: number | null;
  packageOptions?: Array<{ units: number; price: number }> | null;
  features?: string | null;
  image?: string | null;
  galleryImages?: string[] | null;
  isActive?: boolean | null;
  locations?: Array<{
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    unitCount?: number | null;
    regionMain?: string | null;
    regionSub?: string | null;
    dailyFootfall?: number | null;
    priceNote?: string | null;
    note?: string | null;
  }> | null;
};

function networkDraftTool(): Anthropic.Tool {
  return {
    name: TOOL,
    description:
      "THINKAD 네트워크 매체 빠른 등록용 JSON. 가격·패키지는 만원/월 단위.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "type"],
      properties: {
        name: { type: "string", description: "네트워크 매체 한글 이름" },
        nameEn: { type: "string", description: "영문 이름 (선택)" },
        type: {
          type: "string",
          enum: [...NETWORK_TYPE_CODES],
          description: "네트워크 유형 코드",
        },
        description: { type: "string", description: "상세 설명" },
        minUnits: {
          type: "number",
          description: "최소 구매 면수/지점 수 (기본 1)",
        },
        pricePerUnit: {
          type: "number",
          description: "면(지점)당 월 단가, 원 (예: 300000 = 30만원)",
        },
        pricePackage: {
          type: "number",
          description: "고정 패키지 월 가격, 원 (선택)",
        },
        packageOptions: {
          type: "array",
          description: "수량별 패키지 가격 [{units, price}] price는 원 단위",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["units", "price"],
            properties: {
              units: { type: "number" },
              price: { type: "number" },
            },
          },
        },
        features: { type: "string", description: "특징·장점 요약" },
        image: { type: "string", description: "대표 이미지 URL (없으면 생략)" },
        galleryImages: {
          type: "array",
          items: { type: "string" },
        },
        isActive: { type: "boolean", description: "사이트 노출 (기본 true)" },
        locations: {
          type: "array",
          description: "대표 지점 (선택). 없으면 빈 배열",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name"],
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              unitCount: { type: "number" },
              regionMain: { type: "string" },
              regionSub: { type: "string" },
              dailyFootfall: { type: "number" },
              priceNote: { type: "string" },
              note: { type: "string" },
            },
          },
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

function buildTypeGuide(): string {
  return NETWORK_TYPE_CODES.map(
    (code) => `- ${code}: ${NETWORK_TYPE_LABELS[code]?.ko ?? code}`,
  ).join("\n");
}

const LOCATION_COORD_GUIDE = `
대표 지역 좌표 (지점명·주소 생성 시 참고, 소수점 4자리 이상):
- 강남/강남역: 37.4979, 127.0276 (서울 강남구)
- 판교/분당: 37.3947, 127.1112 (경기 성남시 분당구)
- 송도: 37.3825, 126.6442 (인천 연수구)
- 여의도: 37.5216, 126.9243 (서울 영등포구)
- 홍대: 37.5572, 126.9236 (서울 마포구)
- 해운대: 37.1690, 129.1300 (부산 해운대구)
- 광화문: 37.5720, 126.9769 (서울 종로구)
`.trim();

const SYSTEM = `You are a THINKAD OOH network media catalog assistant for Korean out-of-home advertising.

Convert informal Korean (or English) descriptions into structured network media registration data.

Rules:
- All monetary values are in **KRW (원) per month** unless clearly a one-time fee. Convert "만원" to 원 (1만원 = 10000).
- If the user gives package tiers (e.g. 50 units = 1500만 → price: 15000000, 100 units = 2800만 → price: 28000000), fill packageOptions with {units, price}.
- If only per-unit price is given, set pricePerUnit (in 원).
- Pick the best matching type code from the allowed list.
- description and features should be concise Korean marketing copy (2–4 sentences total across both).
- locations are OPTIONAL. If area names are given, create one location per area with realistic name, address, lat/lng.
- If no locations are mentioned, return locations: [] — user can add later.
- Do not invent image URLs; omit image/galleryImages unless explicitly provided.
- minUnits: infer from minimum package size mentioned, else 1.

Allowed type codes:
${buildTypeGuide()}

${LOCATION_COORD_GUIDE}

Output: call emit_network_quick_add exactly once with complete fields.`;

export type GenerateNetworkDraftResult = {
  data: NetworkQuickAddParsed;
  json: string;
  model: string;
};

export async function generateNetworkQuickAddDraft(
  description: string,
  locationHints?: string,
): Promise<GenerateNetworkDraftResult> {
  const text = description.trim();
  if (!text) {
    throw new Error("설명 텍스트가 필요합니다.");
  }

  const model =
    process.env.NETWORK_AI_MODEL?.trim() || AI_MODELS.contentGen;
  const client = getAnthropicClient();

  const hints = locationHints?.trim();
  const user = hints
    ? `## 네트워크 매체 설명\n${text}\n\n## 지역 힌트 (대표 지점으로 변환)\n${hints}`
    : `## 네트워크 매체 설명\n${text}`;

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [networkDraftTool()],
    tool_choice: { type: "tool", name: TOOL },
    messages: [{ role: "user", content: user }],
  });

  void recordAiUsage({
    feature: "network_draft",
    model,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  });

  const raw = extractToolInput<NetworkDraftToolInput>(message, TOOL);

  const payload = {
    name: raw.name,
    nameEn: raw.nameEn ?? null,
    type: raw.type,
    description: raw.description ?? null,
    minUnits: raw.minUnits ?? 1,
    pricePerUnit: raw.pricePerUnit ?? null,
    pricePackage: raw.pricePackage ?? null,
    packageOptions: raw.packageOptions ?? null,
    features: raw.features ?? null,
    image: raw.image ?? null,
    galleryImages: raw.galleryImages ?? [],
    isActive: raw.isActive !== false,
    locations: raw.locations ?? [],
  };

  const json = JSON.stringify(payload, null, 2);
  const parsed = parseNetworkQuickAddJson(json);
  if (!parsed.ok) {
    throw new Error(`AI JSON 검증 실패: ${parsed.error}`);
  }

  return { data: parsed.data, json, model };
}
