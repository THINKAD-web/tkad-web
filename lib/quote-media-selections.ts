/** 견적 제출 시점 매체·옵션 스냅샷 (priceOptions 변경 후에도 당시 견적 보존) */
export type QuoteMediaSelectionSnapshot = {
  mediaId: string;
  priceOptionIndex: number;
  /** 네트워크·이동형 대수 등 — 미지정 시 1 (레거시 호환) */
  quantity?: number;
  /** PDF·라인 표기용 — 예: "87대", "스팟광고", "3대" */
  quantityLabel?: string | null;
  optionLabel: string | null;
  optionPriceWon: number;
  lineTotalWon: number;
  /** 제출 시점 priceOptions[].description — catalog 변경 후에도 송출 문구 보존 */
  optionDescription?: string | null;
  /** 패키지 기간만 집행 토글 (9d-min) */
  usePackagePeriod?: boolean;
  /** 토글 on 시 라인 집행 일수 (bundleDays) */
  lineCampaignDays?: number;
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
    const quantity =
      typeof o.quantity === "number" &&
      Number.isFinite(o.quantity) &&
      o.quantity > 0
        ? Math.round(o.quantity)
        : undefined;
    const quantityLabel =
      typeof o.quantityLabel === "string" && o.quantityLabel.trim()
        ? o.quantityLabel.trim()
        : null;
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
    const usePackagePeriod = o.usePackagePeriod === true;
    const lineCampaignDays =
      typeof o.lineCampaignDays === "number" &&
      Number.isFinite(o.lineCampaignDays) &&
      o.lineCampaignDays > 0
        ? Math.round(o.lineCampaignDays)
        : undefined;
    out.push({
      mediaId,
      priceOptionIndex,
      ...(quantity != null ? { quantity } : {}),
      ...(quantityLabel ? { quantityLabel } : {}),
      optionLabel,
      optionPriceWon,
      lineTotalWon,
      ...(optionDescription ? { optionDescription } : {}),
      ...(usePackagePeriod ? { usePackagePeriod: true } : {}),
      ...(lineCampaignDays != null ? { lineCampaignDays } : {}),
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

export function mediaQuantitiesFromSelections(
  selections: QuoteMediaSelectionSnapshot[] | null | undefined,
): Record<string, number> | undefined {
  if (!selections?.length) return undefined;
  const out: Record<string, number> = {};
  for (const s of selections) {
    if (s.quantity != null && s.quantity > 0) out[s.mediaId] = s.quantity;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
