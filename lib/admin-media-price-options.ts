import { Prisma } from "@prisma/client";
import {
  parsePartialPeriodRatesFromPriceOptionRow,
  type PartialPeriodRatesMap,
} from "@/lib/media-partial-period-rates";
import {
  coercePriceOptionPeriodForWrite,
  formatPriceOptionPeriodWriteError,
} from "@/lib/media-price-period-write";

/** Admin·API 공통: DB `price_options` JSON 배열 한 행 */
export type AdminMediaPriceOption = {
  label: string;
  price: number;
  period?: string;
  description?: string;
  partialPeriodRates?: PartialPeriodRatesMap;
};

export type NormalizePriceOptionsResult =
  | { kind: "skip" }
  | { kind: "ok"; data: Prisma.InputJsonValue }
  | { kind: "error"; message: string };

/**
 * PATCH/POST `priceOptions` 본문 정규화.
 * - 키가 없으면 `skip`
 * - `null` 또는 유효 항목 없음 → `JsonNull`
 * - period: enum 4키 또는 안전 month 별칭(→month). 그 외는 error (재발 방지)
 */
export function normalizePriceOptionsForPrisma(
  body: Record<string, unknown>,
): NormalizePriceOptionsResult {
  if (!Object.prototype.hasOwnProperty.call(body, "priceOptions")) {
    return { kind: "skip" };
  }
  const v = body.priceOptions;
  if (v === null) {
    return {
      kind: "ok",
      data: Prisma.JsonNull as unknown as Prisma.InputJsonValue,
    };
  }
  if (!Array.isArray(v)) {
    return {
      kind: "error",
      message: "priceOptions는 배열이거나 null이어야 합니다.",
    };
  }
  const out: AdminMediaPriceOption[] = [];
  for (let i = 0; i < v.length; i++) {
    const row = v[i];
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const price = Number(o.price);
    if (!label || !Number.isFinite(price)) {
      continue;
    }
    const periodResult = coercePriceOptionPeriodForWrite(o.period);
    if (periodResult.kind === "error") {
      return {
        kind: "error",
        message: formatPriceOptionPeriodWriteError(i, periodResult.message),
      };
    }
    if (periodResult.kind === "ok" && periodResult.coercedFrom) {
      console.warn(
        `[priceOptions] period alias coerced: "${periodResult.coercedFrom}" → month (index ${i}, label=${label})`,
      );
    }
    const description =
      typeof o.description === "string" && o.description.trim()
        ? o.description.trim()
        : undefined;
    const item: AdminMediaPriceOption = { label, price };
    if (periodResult.kind === "ok") item.period = periodResult.period;
    if (description) item.description = description;
    const partialPeriodRates = parsePartialPeriodRatesFromPriceOptionRow(o);
    if (partialPeriodRates) item.partialPeriodRates = partialPeriodRates;
    out.push(item);
  }
  if (out.length === 0) {
    return {
      kind: "ok",
      data: Prisma.JsonNull as unknown as Prisma.InputJsonValue,
    };
  }
  return { kind: "ok", data: out as unknown as Prisma.InputJsonValue };
}
