import { getAnthropicClient, resolveModel } from "@/lib/ai-content-generator";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

export async function generateChatAiOwnerReply(input: {
  mediaName: string;
  location: string;
  type: string;
  price: number;
  width?: string | null;
  height?: string | null;
  advertiserMessage: string;
  locale: string;
}): Promise<string | null> {
  const client = getAnthropicClient();
  const isKo = input.locale !== "en";
  const priceLabel = formatCatalogPriceFieldWon(input.price, input.locale);

  const fallback = isKo
    ? `「${input.mediaName}」(${input.location}) 참고 정보: 유형 ${input.type}, 월 단가 약 ${priceLabel}. 상세 일정·슬롯은 매체사 확인 후 안내됩니다.`
    : `Reference for "${input.mediaName}" (${input.location}): ${input.type}, approx. ${priceLabel}/mo. Schedule details follow owner confirmation.`;

  if (!client) return fallback;

  try {
    const res = await client.messages.create({
      model: resolveModel(),
      max_tokens: 350,
      messages: [
        {
          role: "user",
          content: `You are THINKAD's anonymous chat assistant. Reply as "매체사 운영자" proxy with ONLY public listing facts. No phone/email. Korean if locale=ko.

Media: ${input.mediaName}, ${input.location}, type ${input.type}, price ${priceLabel}, size ${input.width ?? "?"}x${input.height ?? "?"}

Advertiser asked: ${input.advertiserMessage}

Reply in 2-4 short sentences.`,
        },
      ],
    });
    const text =
      res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return text || fallback;
  } catch {
    return fallback;
  }
}
