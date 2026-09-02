/**
 * User-facing media labels — single SSOT for list/detail/search pills.
 *
 * Offline: display mode (`Media.type` → DISPLAY_MODE_LABELS)
 * Online: browse main label (`mediaMainCategory` → online mains)
 *
 * Never falls back to raw `type` slug on public surfaces (PR1b-2).
 */

import { browseCategoryLabel } from "@/lib/media-browse-categories";
import {
  canonicalCatalogChannel,
  CATALOG_CHANNEL_LABELS,
  type CatalogChannel,
} from "@/lib/catalog-channel";
import { displayModeLabel } from "@/lib/display-mode-labels";
import { isOnlineBrowseMain } from "@/lib/online-browse-mains";

const NETWORK_PILL = { ko: "네트워크/패키지", en: "Network / package" } as const;

export type MediaDisplayLabelInput = {
  catalogChannel?: string | null;
  type?: string | null;
  mediaMainCategory?: string | null;
  mediaSubCategory?: string | null;
  catalogSource?: "media" | "network";
};

export type MediaDisplayLabels = {
  /** Primary pill / meta segment (never a raw DB slug) */
  pill: string;
  /** Secondary line segment when browse sub exists (online) */
  subPill?: string;
  catalogChannel: CatalogChannel;
};

function resolveCatalogChannel(item: MediaDisplayLabelInput): CatalogChannel {
  const explicit = item.catalogChannel?.trim();
  if (explicit) return canonicalCatalogChannel(explicit);
  if (isOnlineBrowseMain(item.mediaMainCategory)) return "online";
  return "offline";
}

function isOnlineMedia(item: MediaDisplayLabelInput): boolean {
  return resolveCatalogChannel(item) === "online";
}

export function resolveMediaDisplayLabels(
  item: MediaDisplayLabelInput,
  locale: "ko" | "en" = "ko",
): MediaDisplayLabels {
  const catalogChannel = resolveCatalogChannel(item);

  if (item.catalogSource === "network") {
    const pill =
      locale === "ko" ? NETWORK_PILL.ko : NETWORK_PILL.en;
    return { pill, catalogChannel: "offline" };
  }

  if (isOnlineMedia(item)) {
    const main = item.mediaMainCategory?.trim();
    const pill = main
      ? browseCategoryLabel(main, locale, "main")
      : CATALOG_CHANNEL_LABELS.online[locale];
    const sub = item.mediaSubCategory?.trim();
    const subPill = sub
      ? browseCategoryLabel(sub, locale, "sub", main ?? undefined)
      : undefined;
    return { pill, subPill, catalogChannel: "online" };
  }

  const pill = displayModeLabel(item.type, locale);
  return { pill, catalogChannel: "offline" };
}

/** Convenience — primary pill only */
export function resolveMediaDisplayPill(
  item: MediaDisplayLabelInput,
  locale: "ko" | "en" = "ko",
): string {
  return resolveMediaDisplayLabels(item, locale).pill;
}

/** Meta line: `location · pill` pattern helper */
export function formatMediaMetaLine(
  parts: Array<string | null | undefined>,
): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(" · ");
}

/** Search/index haystack — localized pills (never raw slug) */
export function mediaDisplayLabelHaystack(
  item: MediaDisplayLabelInput,
): [string, string] {
  return [
    resolveMediaDisplayPill(item, "ko"),
    resolveMediaDisplayPill(item, "en"),
  ];
}
