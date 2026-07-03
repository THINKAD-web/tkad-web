/** 견적 제출 시점 매체·옵션 스냅샷 (priceOptions 변경 후에도 당시 견적 보존) */
export type QuoteMediaSelectionSnapshot = {
  mediaId: string;
  priceOptionIndex: number;
  optionLabel: string | null;
  optionPriceWon: number;
  lineTotalWon: number;
  /** 제출 시점 priceOptions[].description — catalog 변경 후에도 송출 문구 보존 */
  optionDescription?: string | null;
};

export function parseQuoteMediaSelections(
  raw: unknown,
): QuoteMediaSelectionSnapshot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: QuoteMediaSelectionSnapshot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const mediaId = typeof o.mediaId === "string" ? o.mediaId.trim() : "";
    if (!mediaId) continue;
    const priceOptionIndex =
      typeof o.priceOptionIndex === "number"
        ? Math.max(0, Math.floor(o.priceOptionIndex))
        : 0;
    const optionLabel =
      typeof o.optionLabel === "string" && o.optionLabel.trim()
        ? o.optionLabel.trim()
        : null;
    const optionPriceWon =
      typeof o.optionPriceWon === "number" && Number.isFinite(o.optionPriceWon)
        ? Math.round(o.optionPriceWon)
        : 0;
    const lineTotalWon =
      typeof o.lineTotalWon === "number" && Number.isFinite(o.lineTotalWon)
        ? Math.round(o.lineTotalWon)
        : 0;
    const optionDescription =
      typeof o.optionDescription === "string" && o.optionDescription.trim()
        ? o.optionDescription.trim()
        : null;
    out.push({
      mediaId,
      priceOptionIndex,
      optionLabel,
      optionPriceWon,
      lineTotalWon,
      ...(optionDescription ? { optionDescription } : {}),
    });
  }
  return out.length > 0 ? out : undefined;
}

export function mediaPriceOptionIndexFromSelections(
  selections: QuoteMediaSelectionSnapshot[] | null | undefined,
): Record<string, number> | undefined {
  if (!selections?.length) return undefined;
  return Object.fromEntries(
    selections.map((s) => [s.mediaId, s.priceOptionIndex]),
  );
}

export function selectionsByMediaId(
  selections: QuoteMediaSelectionSnapshot[] | null | undefined,
): Map<string, QuoteMediaSelectionSnapshot> {
  const map = new Map<string, QuoteMediaSelectionSnapshot>();
  if (!selections) return map;
  for (const s of selections) {
    map.set(s.mediaId, s);
  }
  return map;
}
