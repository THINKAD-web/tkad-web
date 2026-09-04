import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";

export type ReportCartComposition = "onlyOoh" | "onlyOnline" | "mixed";

export type SplitPortfolioByChannelResult = {
  composition: ReportCartComposition;
  oohPortfolio: MediaItem[];
  onlinePortfolio: MediaItem[];
  oohCartItems: PlanCartItem[];
  onlineCartItems: PlanCartItem[];
};

function resolveComposition(
  oohCount: number,
  onlineCount: number,
): ReportCartComposition {
  if (oohCount > 0 && onlineCount > 0) return "mixed";
  if (onlineCount > 0) return "onlyOnline";
  return "onlyOoh";
}

/**
 * Plan-cart report — split portfolio + cart lines by `catalog_channel`.
 * OOH builder must never receive online rows (and vice versa).
 */
export function splitPortfolioByCatalogChannel(
  portfolio: readonly MediaItem[],
  cartItems: readonly PlanCartItem[] = [],
): SplitPortfolioByChannelResult {
  const cartByMediaId = new Map(cartItems.map((item) => [item.mediaId, item]));
  const oohPortfolio: MediaItem[] = [];
  const onlinePortfolio: MediaItem[] = [];
  const oohCartItems: PlanCartItem[] = [];
  const onlineCartItems: PlanCartItem[] = [];

  for (const media of portfolio) {
    const cartItem = cartByMediaId.get(media.id);
    if (isOnlineCatalogMedia(media)) {
      onlinePortfolio.push(media);
      if (cartItem) onlineCartItems.push(cartItem);
    } else {
      oohPortfolio.push(media);
      if (cartItem) oohCartItems.push(cartItem);
    }
  }

  return {
    composition: resolveComposition(oohPortfolio.length, onlinePortfolio.length),
    oohPortfolio,
    onlinePortfolio,
    oohCartItems,
    onlineCartItems,
  };
}
