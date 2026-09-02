/**
 * PR3/PR5-a — SSOT: billable numeric quote/pricing is unavailable for this media row.
 *
 * All client money surfaces (wizard, compare-quote, planner, detail sticky)
 * must call `isPricingUnavailable()` — not ad-hoc catalog_channel checks.
 *
 * PR5-a: online rows with CPC/CPM on `onlineSpec` are billable on detail only;
 * list/compare payloads omit `onlineSpec` → still inquiry until PR5-b.
 */

import {
  CATALOG_CHANNEL_ONLINE,
  canonicalCatalogChannel,
} from "@/lib/catalog-channel";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import {
  resolveCatalogLineMonthlyPriceWon,
} from "@/lib/media-quantity";
import {
  catalogPriceFieldToWon,
} from "@/lib/media-price-format";
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import { hasOnlinePricingSpec as hasRatesOnSpec } from "@/lib/pricing/online-performance-estimate";

export type PricingUnavailableMedia = Pick<
  MediaItem,
  | "catalogChannel"
  | "type"
  | "price"
  | "catalogSource"
  | "networkMinUnits"
  | "priceOptions"
  | "pricePeriod"
> & {
  onlineSpec?: MediaOnlineSpecView | null;
};

/** Online row with seeded CPC/CPM ranges — detail + BudgetPricing calculable. */
export function hasOnlinePricingSpec(
  media: Pick<PricingUnavailableMedia, "catalogChannel" | "onlineSpec">,
): boolean {
  if (!isOnlineCatalogMedia(media)) return false;
  return hasRatesOnSpec(media.onlineSpec);
}

export function isOnlineCatalogMedia(
  media: Pick<PricingUnavailableMedia, "catalogChannel">,
): boolean {
  return canonicalCatalogChannel(media.catalogChannel) === CATALOG_CHANNEL_ONLINE;
}

/** PR3 front gate — quote wizard catalog / planner add until PR5 */
export function isQuoteWizardSelectableMedia(
  media: Pick<PricingUnavailableMedia, "catalogChannel">,
): boolean {
  return !isOnlineCatalogMedia(media);
}

export function canAddMediaToPlanCart(
  media: Pick<PricingUnavailableMedia, "catalogChannel">,
): boolean {
  return !isOnlineCatalogMedia(media);
}

/** Offline unpriceable — null type/price or resolved unit ≤0 (PR1b-2). */
export function isOfflineUnpriceableMedia(
  media: PricingUnavailableMedia,
  opts?: {
    priceOptionIndex?: number;
    mobileUnits?: number;
    networkUnits?: number;
  },
): boolean {
  if (isOnlineCatalogMedia(media)) return false;
  if (!media.type?.trim()) return true;
  if (media.price == null) return true;
  const isNw = media.catalogSource === "network";
  const poIdx = opts?.priceOptionIndex ?? 0;
  const resolvedWon = isNw
    ? catalogPriceFieldToWon(
        computeNetworkMonthlyFromMediaItem(
          media as MediaItem,
          opts?.networkUnits ?? media.networkMinUnits ?? 1,
        ),
      )
    : catalogPriceFieldToWon(
        resolveCatalogLineMonthlyPriceWon(media as MediaItem, {
          priceOptionIndex: poIdx,
          units: opts?.mobileUnits,
        }),
      );
  return resolvedWon <= 0;
}

/**
 * True when UI must not show billable ₩ amounts (online inquiry or offline unpriceable).
 */
export function isPricingUnavailable(
  media: PricingUnavailableMedia,
  opts?: {
    priceOptionIndex?: number;
    mobileUnits?: number;
    networkUnits?: number;
  },
): boolean {
  if (isOnlineCatalogMedia(media)) {
    return !hasOnlinePricingSpec(media);
  }
  return isOfflineUnpriceableMedia(media, opts);
}
