import { Prisma } from "@prisma/client";

/** Admin·API 공통: DB `price_options` JSON 배열 한 행 */
export type AdminMediaPriceOption = {
  label: string;
  price: number;
  period?: string;
  description?: string;
};

export type NormalizePriceOptionsResult =
  | { kind: "skip" }
  | { kind: "ok"; data: Prisma.InputJsonValue }
  | { kind: "error"; message: string };

/**
 * PATCH/POST `priceOptions` 본문 정규화.
 * - 키가 없으면 `skip`
 * - `null` 또는 유효 항목 없음 → `JsonNull`
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
    const period =
      typeof o.period === "string" && o.period.trim()
        ? o.period.trim()
        : undefined;
    const description =
      typeof o.description === "string" && o.description.trim()
        ? o.description.trim()
        : undefined;
    const item: AdminMediaPriceOption = { label, price };
    if (period) item.period = period;
    if (description) item.description = description;
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
