/** QuoteItem.spec — 어드민 견적 라인 메타 (표시 spec + 옵션 인덱스·수량 라벨) */

export const ADMIN_QUOTE_SPEC_PREFIX = "tkad:v1:";

export type AdminQuoteLineSpecMeta = {
  priceOptionIndex: number;
  quantityLabel?: string;
  /** admin이 소계를 수동 덮어쓴 경우 (원) */
  amountOverrideWon?: number;
};

export function encodeAdminQuoteItemSpec(
  displaySpec: string,
  meta: AdminQuoteLineSpecMeta,
): string {
  const override =
    typeof meta.amountOverrideWon === "number" &&
    Number.isFinite(meta.amountOverrideWon) &&
    meta.amountOverrideWon >= 0
      ? Math.round(meta.amountOverrideWon)
      : undefined;
  return (
    ADMIN_QUOTE_SPEC_PREFIX +
    JSON.stringify({
      display: displaySpec,
      priceOptionIndex: Math.max(0, Math.round(meta.priceOptionIndex)),
      ...(meta.quantityLabel?.trim()
        ? { quantityLabel: meta.quantityLabel.trim() }
        : {}),
      ...(override != null ? { amountOverrideWon: override } : {}),
    })
  );
}

export function decodeAdminQuoteItemSpec(spec: string | null | undefined): {
  displaySpec: string;
  meta: AdminQuoteLineSpecMeta;
} {
  const raw = spec?.trim() ?? "";
  if (!raw.startsWith(ADMIN_QUOTE_SPEC_PREFIX)) {
    return {
      displaySpec: raw || "—",
      meta: { priceOptionIndex: 0 },
    };
  }
  try {
    const o = JSON.parse(raw.slice(ADMIN_QUOTE_SPEC_PREFIX.length)) as Record<
      string,
      unknown
    >;
    const display =
      typeof o.display === "string" && o.display.trim() ? o.display.trim() : "—";
    const priceOptionIndex =
      typeof o.priceOptionIndex === "number" &&
      Number.isFinite(o.priceOptionIndex)
        ? Math.max(0, Math.round(o.priceOptionIndex))
        : 0;
    const quantityLabel =
      typeof o.quantityLabel === "string" && o.quantityLabel.trim()
        ? o.quantityLabel.trim()
        : undefined;
    const amountOverrideWon =
      typeof o.amountOverrideWon === "number" &&
      Number.isFinite(o.amountOverrideWon) &&
      o.amountOverrideWon >= 0
        ? Math.round(o.amountOverrideWon)
        : undefined;
    return {
      displaySpec: display,
      meta: {
        priceOptionIndex,
        quantityLabel,
        ...(amountOverrideWon != null ? { amountOverrideWon } : {}),
      },
    };
  } catch {
    return { displaySpec: raw || "—", meta: { priceOptionIndex: 0 } };
  }
}
