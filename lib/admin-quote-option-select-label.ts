import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";

/** Admin 견적 라인 `<select>` 옵션 라벨 — 등급명 + 기간 단가 */
export function formatAdminQuoteOptionSelectLabel(
  option: {
    label?: string | null;
    price?: number | null;
    period?: string | null;
  },
  mediaPricePeriod: string | null | undefined,
  locale: string,
): string {
  const period = option.period ?? mediaPricePeriod;
  const pricePart = formatMediaPriceWithPeriodSuffix(
    Number(option.price) || 0,
    period,
    locale,
  );
  const label = option.label?.trim();
  return label ? `${label} — ${pricePart}` : pricePart;
}
