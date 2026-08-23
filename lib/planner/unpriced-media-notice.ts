/**
 * @deprecated Use `lib/planner/quote-only-portfolio.ts` — 협의가(quote_only) 매체 안내.
 */

import type { MediaItem } from "@/lib/media-data";
import { isQuoteOnlyMedia } from "@/lib/media-pricing-mode";
import { buildQuoteOnlyNotice } from "@/lib/planner/quote-only-portfolio";

export type UnpricedMediaNotice = {
  text: string;
  affectedMediaIds: string[];
};

export function portfolioHasUnpricedMedia(
  portfolio: readonly MediaItem[],
): boolean {
  return portfolio.some((m) => isQuoteOnlyMedia(m));
}

export function buildUnpricedMediaNotice(args: {
  portfolio: readonly MediaItem[];
  isKo: boolean;
}): UnpricedMediaNotice | undefined {
  const notice = buildQuoteOnlyNotice(args);
  if (!notice) return undefined;
  return { text: notice.text, affectedMediaIds: notice.affectedMediaIds };
}
