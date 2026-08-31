/**
 * DB priceOptions + base row → PriceOption[] (감사용 raw read).
 * 견적 엔진 `mediaPriceOptions` 와 달리 충돌 base 를 버리지 않는다.
 */
import { resolveOptionDays } from "./price";
import type { PriceOption } from "./types";

export type PriceOptionsRow = {
  price: number;
  pricePeriod: string;
  pricePeriodDays?: number | null;
  priceOptions: unknown;
};

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

export function readPriceOptions(row: PriceOptionsRow): PriceOption[] {
  const out: PriceOption[] = [];

  const baseDays = resolveOptionDays(row.pricePeriod, row.pricePeriodDays);
  if (baseDays != null && row.price > 0) {
    out.push({ days: baseDays, price: row.price, id: "base", label: "기본가" });
  }

  if (Array.isArray(row.priceOptions)) {
    row.priceOptions.forEach((raw, idx) => {
      if (!raw || typeof raw !== "object") return;
      const o = raw as Record<string, unknown>;
      const price = num(o.price);
      if (price == null || price <= 0) return;
      const days = resolveOptionDays(
        typeof o.period === "string" ? o.period : row.pricePeriod,
        typeof o.periodDays === "number" ? o.periodDays : null,
      );
      if (days == null) return;
      out.push({
        days,
        price,
        id: `po-${idx}`,
        label: typeof o.label === "string" ? o.label : undefined,
      });
    });
  }

  return out;
}
