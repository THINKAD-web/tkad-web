import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import type { QuotePdfPreviewRow } from "@/components/quote-pdf-preview";
import {
  selectionsByMediaId,
  type QuoteMediaSelectionSnapshot,
} from "@/lib/quote-media-selections";
import { formatMediaPrice } from "@/lib/media-price-format";
import { oohQuoteManwonToWon } from "@/lib/ooh-quote-amount";

/** `/api/quote/[id]/detail` 매체 행 — preview 빌더 입력 */
export type QuoteDetailPreviewMedia = {
  id: string;
  name: string;
  location: string;
  region?: string;
  type: string;
  price: number;
  lineTotalWon?: number | null;
  priceOptionIndex?: number | null;
  optionLabel?: string | null;
  pricePeriod?: string;
  image: string | null;
  dailyFootTraffic?: number | null;
  impressions?: number | null;
};

export type QuoteDetailPreviewQuote = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  period: string;
  createdAt: string;
  totalAmount: number;
  mediaSelections?: QuoteMediaSelectionSnapshot[] | null;
  medias: QuoteDetailPreviewMedia[];
};

function localeTag(isKo: boolean): "ko-KR" | "en-US" {
  return isKo ? "ko-KR" : "en-US";
}

function formatMediaDisplayName(
  m: QuoteDetailPreviewMedia,
  snap: QuoteMediaSelectionSnapshot | undefined,
  isKo: boolean,
): string {
  const base =
    m.name.includes("(") && snap?.optionLabel
      ? m.name.replace(` (${snap.optionLabel})`, "")
      : m.name;
  const parts = [base];
  if (snap?.quantityLabel) parts.push(snap.quantityLabel);
  else if (snap?.optionLabel && !m.name.includes(snap.optionLabel)) {
    parts.push(snap.optionLabel);
  }
  return parts.join(" · ");
}

function previewMediaSelectionPairs(
  medias: readonly QuoteDetailPreviewMedia[],
  selections: readonly QuoteMediaSelectionSnapshot[] | null | undefined,
): Array<{
  media: QuoteDetailPreviewMedia;
  snap?: QuoteMediaSelectionSnapshot;
  rowKey: string;
}> {
  if (!selections?.length) {
    return medias.map((media) => ({ media, rowKey: media.id }));
  }
  const mediaById = new Map(medias.map((m) => [m.id, m]));
  const hasDuplicateMediaIds =
    selections.length > new Set(selections.map((s) => s.mediaId)).size;
  if (hasDuplicateMediaIds) {
    return selections.flatMap((snap, index) => {
      const media = mediaById.get(snap.mediaId);
      if (!media) return [];
      return [
        {
          media,
          snap,
          rowKey: `${snap.mediaId}-${snap.priceOptionIndex}-${index}`,
        },
      ];
    });
  }
  const map = selectionsByMediaId([...selections]);
  return medias.map((media) => ({
    media,
    snap: map.get(media.id),
    rowKey: media.id,
  }));
}

export function inferQuotePreviewPeriodMonths(period: string): number {
  const m = period.match(/(\d+)\s*(?:개월|month)/i);
  if (m) return Math.max(1, parseInt(m[1]!, 10));
  return 1;
}

export function buildQuotePreviewPdfRows(
  medias: readonly QuoteDetailPreviewMedia[],
  selections: readonly QuoteMediaSelectionSnapshot[] | null | undefined,
  isKo: boolean,
  periodLabel: string,
): QuotePdfPreviewRow[] {
  return previewMediaSelectionPairs(medias, selections).map(
    ({ media: m, snap, rowKey }) => {
      const unitPriceWon = snap?.optionPriceWon ?? m.price;
      const lineTotalWon =
        snap?.lineTotalWon ?? m.lineTotalWon ?? unitPriceWon;
      return {
        id: rowKey,
        thumbUrl: m.image,
        name: formatMediaDisplayName(m, snap, isKo),
        location: m.location,
        unitPriceWon,
        lineTotalWon,
        unitPeriodLabel: isKo ? "월" : "mo",
        executionPeriodLabel: periodLabel,
        categoryLabel: m.type,
        dailyFootTraffic: m.dailyFootTraffic ?? null,
      };
    },
  );
}

export function buildQuotePreviewLineDetails(
  medias: readonly QuoteDetailPreviewMedia[],
  selections: readonly QuoteMediaSelectionSnapshot[] | null | undefined,
  isKo: boolean,
  periodLabel: string,
): DocumentMediaDetail[] {
  const loc = localeTag(isKo);
  return previewMediaSelectionPairs(medias, selections).map(
    ({ media: m, snap, rowKey }) => {
      const unitPriceWon = snap?.optionPriceWon ?? m.price;
      const lineTotalWon =
        snap?.lineTotalWon ?? m.lineTotalWon ?? unitPriceWon;
      return {
        id: rowKey,
        name: formatMediaDisplayName(m, snap, isKo),
        location: m.location,
        thumbUrl: m.image,
        categoryLabel: m.type,
        quantityLabel: snap?.quantityLabel ?? undefined,
        dailyTraffic: m.dailyFootTraffic ?? undefined,
        monthlyPriceLabel: formatMediaPrice(unitPriceWon, loc),
        lineTotalLabel: formatMediaPrice(lineTotalWon, loc),
        executionPeriodLabel: periodLabel,
      };
    },
  );
}

export function quotePreviewAmountsWon(displayTotalManwon: number): {
  subtotalWon: number;
  vatWon: number;
  grandTotalWon: number;
} {
  const subtotalWon = Math.round(oohQuoteManwonToWon(displayTotalManwon));
  const vatWon = Math.round(subtotalWon * 0.1);
  return {
    subtotalWon,
    vatWon,
    grandTotalWon: subtotalWon + vatWon,
  };
}
