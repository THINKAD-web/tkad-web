import type { MediaItem } from "@/lib/media-data";
import { findCheapestPriceOptionIndex } from "@/lib/compare-quote";
import { inferQuoteCampaignPeriodFromMedia } from "@/lib/quote-wizard-pricing";

const PO_STORAGE_PREFIX = "tkad-quote-entry-po:";

/** 스티키 패널 등에서 선택한 옵션 — 견적 마법사 진입 시 우선 사용 */
export function rememberQuoteEntryPriceOption(
  mediaId: string,
  index: number,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${PO_STORAGE_PREFIX}${mediaId}`, String(index));
}

export function recallQuoteEntryPriceOption(mediaId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${PO_STORAGE_PREFIX}${mediaId}`);
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function resolveQuoteEntryPriceOptionIndex(media: MediaItem): number {
  const opts = media.priceOptions ?? [];
  if (opts.length === 0) return 0;
  const remembered = recallQuoteEntryPriceOption(media.id);
  if (remembered != null && remembered < opts.length) return remembered;
  return findCheapestPriceOptionIndex(media);
}

/** 단일 매체: `po`+`period` 포함. 복수 매체: `media` id 목록만. */
export function buildQuoteWizardEntryHref(
  media: MediaItem | readonly MediaItem[],
): string {
  const list = Array.isArray(media) ? [...media] : [media];
  const ids = list.map((m) => m.id).filter(Boolean);
  if (ids.length === 0) return "/quote";

  const q = new URLSearchParams();
  q.set("media", ids.join(","));

  if (list.length === 1) {
    const m = list[0]!;
    const opts = m.priceOptions ?? [];
    if (opts.length > 0) {
      const poIdx = resolveQuoteEntryPriceOptionIndex(m);
      q.set("po", String(poIdx));
      q.set("period", inferQuoteCampaignPeriodFromMedia(m, poIdx));
    }
  }

  return `/quote?${q.toString()}`;
}
