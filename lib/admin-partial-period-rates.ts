import { Prisma } from "@prisma/client";
import { parsePartialPeriodRatesRaw } from "@/lib/media-partial-period-rates";

export type NormalizePartialPeriodRatesResult =
  | { kind: "skip" }
  | { kind: "ok"; data: Prisma.InputJsonValue | typeof Prisma.JsonNull }
  | { kind: "error"; message: string };

/**
 * PATCH/POST `partialPeriodRates` 본문 정규화.
 * - 키 없음 → skip
 * - null 또는 빈 map → JsonNull
 */
export function normalizePartialPeriodRatesForPrisma(
  body: Record<string, unknown>,
): NormalizePartialPeriodRatesResult {
  if (!Object.prototype.hasOwnProperty.call(body, "partialPeriodRates")) {
    return { kind: "skip" };
  }
  const v = body.partialPeriodRates;
  if (v === null) {
    return { kind: "ok", data: Prisma.JsonNull };
  }
  const parsed = parsePartialPeriodRatesRaw(v);
  if (!parsed) {
    return { kind: "ok", data: Prisma.JsonNull };
  }
  return { kind: "ok", data: parsed as unknown as Prisma.InputJsonValue };
}
