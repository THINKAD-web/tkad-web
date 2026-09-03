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

/**
 * Step 1 picker visibility — online catalog rows shown from PR5-b commit 1.
 * Selectability remains `isQuoteWizardSelectableMedia` until commit 2.
 */
export function isQuoteWizardVisibleMedia(
  _media: Pick<PricingUnavailableMedia, "catalogChannel">,
): boolean {
  return true;
}

/** PR3 front gate — quote wizard add-to-cart until PR5-b commit 2 (calculable online). */
export function isQuoteWizardSelectableMedia(
  media: Pick<PricingUnavailableMedia, "catalogChannel">,
): boolean {
  return !isOnlineCatalogMedia(media);
}

/** Toast copy when Step 1 toggle blocked — distinguishes calculable vs inquiry online. */
export function quoteWizardSelectBlockedMessage(
  media: Pick<PricingUnavailableMedia, "catalogChannel" | "onlineSpec">,
  isKo: boolean,
): string {
  if (isOnlineCatalogMedia(media) && hasOnlinePricingSpec(media)) {
    return isKo
      ? "온라인 매체(월 예산)는 아직 견적 위저드에 담을 수 없습니다. 곧 지원 예정입니다."
      : "Online media (monthly budget) cannot be added to the quote wizard yet — coming soon.";
  }
  if (isOnlineCatalogMedia(media)) {
    return isKo
      ? "가격 문의 온라인 매체는 견적 위저드에 담을 수 없습니다. 매체 상세에서 문의해 주세요."
      : "Inquiry-only online media cannot be added to the quote wizard. Please contact us from the media page.";
  }
  return isKo
    ? "이 매체는 견적 위저드에 담을 수 없습니다."
    : "This media cannot be added to the quote wizard.";
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
