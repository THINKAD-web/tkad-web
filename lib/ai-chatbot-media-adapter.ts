import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import {
  formatMediaPriceWithPeriodSuffix,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";

/** Chatbot tool card price is monthly 만원; catalog/plan-cart use DB won field. */
export function chatbotCardPriceToCatalogWon(priceMan: number): number {
  if (!Number.isFinite(priceMan) || priceMan <= 0) return 0;
  return Math.round(priceMan * 10_000);
}

export function chatbotCardToCatalogItem(
  card: AiChatbotMediaCard,
): Pick<
  HomeCatalogMediaItem,
  "id" | "name" | "type" | "region" | "location" | "price" | "pricePeriod" | "thumbnailUrl"
> {
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    region: card.region,
    location: card.location,
    price: chatbotCardPriceToCatalogWon(card.price),
    pricePeriod: card.pricePeriod,
    thumbnailUrl: card.imageUrl ?? undefined,
  };
}

export function formatChatbotCardPrice(
  card: AiChatbotMediaCard,
  isKo: boolean,
): string {
  const won = chatbotCardPriceToCatalogWon(card.price);
  if (won <= 0) return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
  return formatMediaPriceWithPeriodSuffix(
    won,
    card.pricePeriod ?? "month",
    isKo ? "ko-KR" : "en-US",
  );
}
