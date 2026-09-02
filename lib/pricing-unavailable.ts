/**
 * PR3 — SSOT: billable numeric quote/pricing is unavailable for this media row.
 *
 * All client money surfaces (wizard, compare-quote, planner, detail sticky)
 * must call `isPricingUnavailable()` — not ad-hoc catalog_channel checks.
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
import type { MediaItem } from "@/lib/media-data";

export type PricingUnavailableMedia = Pick<
  MediaItem,
  | "catalogChannel"
  | "type"
  | "price"
  | "catalogSource"
  | "networkMinUnits"
  | "priceOptions"
  | "pricePeriod"
>;

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
 * True when UI must not show billable ₩ amounts (online seed or offline inquiry).
 */
export function isPricingUnavailable(
  media: PricingUnavailableMedia,
  opts?: {
    priceOptionIndex?: number;
    mobileUnits?: number;
    networkUnits?: number;
  },
): boolean {
  if (isOnlineCatalogMedia(media)) return true;
  return isOfflineUnpriceableMedia(media, opts);
}
