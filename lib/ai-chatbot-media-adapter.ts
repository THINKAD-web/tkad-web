import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import {
  formatMediaPriceWithPeriodSuffix,
  mediaPriceOnInquiryLabel,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";

/** Chatbot card `price` is display 만원 (list/map SSOT via `resolveMediaDisplayPrice`). */
export function chatbotCardPriceToCatalogWon(priceMan: number): number {
  if (!Number.isFinite(priceMan) || priceMan <= 0) return 0;
  return Math.round(priceMan * 10_000);
}

/** List/map display SSOT → chatbot card price fields. */
export function chatbotCardPriceFieldsFromMedia(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): { priceMan: number; pricePeriod: MediaPricePeriodKey } {
  const { priceWon, period } = resolveMediaDisplayPrice(media);
  return { priceMan: priceWon / 10_000, pricePeriod: period };
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
