/**
 * priceOptions[].period 쓰기 경로 전용.
 * 읽기 SSOT(`normalizeMediaPricePeriod`)와 분리 — 단기 한글(1일/2주)은
 * 자동 매핑하지 않고 거부한다 (패키지 총액 vs 단가 주기 모호).
 */
import type { MediaPricePeriodKey } from "@/lib/media-data";

export const MEDIA_PRICE_PERIOD_ENUM_KEYS = [
  "month",
  "biweekly",
  "week",
  "day",
] as const satisfies readonly MediaPricePeriodKey[];

export type MediaPricePeriodEnumKey =
  (typeof MEDIA_PRICE_PERIOD_ENUM_KEYS)[number];

/**
 * 의미가 명확한 "한 달" 별칭만 — 백필·쓰기 coerce 대상.
 * 다개월(2개월·12개월), 단기(1일·2주)는 포함하지 않음.
 */
export const SAFE_MONTH_PERIOD_ALIASES = [
  "1개월",
  "월",
  "monthly",
] as const;

const SAFE_MONTH_ALIAS_SET = new Set(
  SAFE_MONTH_PERIOD_ALIASES.map((s) => s.toLowerCase()),
);

const ENUM_SET = new Set<string>(MEDIA_PRICE_PERIOD_ENUM_KEYS);

export function isCanonicalMediaPricePeriod(
  v: string | null | undefined,
): v is MediaPricePeriodEnumKey {
  return typeof v === "string" && ENUM_SET.has(v);
}

export function isSafeMonthPeriodAlias(raw: string): boolean {
  return SAFE_MONTH_ALIAS_SET.has(raw.trim().toLowerCase());
}

export type CoercePriceOptionPeriodResult =
  | { kind: "omit" }
  | {
      kind: "ok";
      period: MediaPricePeriodEnumKey;
      /** 별칭에서 enum으로 변환됨 */
      coercedFrom?: string;
    }
  | { kind: "error"; message: string; raw: string };

/**
 * 저장용 period 정규화.
 * - 비어 있음 → omit
 * - enum 4키 → ok
 * - SAFE_MONTH_PERIOD_ALIASES → month 로 coerce
 * - 그 외 → error (저장 거부)
 */
export function coercePriceOptionPeriodForWrite(
  raw: unknown,
): CoercePriceOptionPeriodResult {
  if (raw == null) return { kind: "omit" };
  if (typeof raw !== "string") {
    return {
      kind: "error",
      message: "period는 문자열이어야 합니다.",
      raw: String(raw),
    };
  }
  const t = raw.trim();
  if (!t) return { kind: "omit" };

  if (isCanonicalMediaPricePeriod(t)) {
    return { kind: "ok", period: t };
  }

  const lower = t.toLowerCase();
  if (SAFE_MONTH_ALIAS_SET.has(lower) || SAFE_MONTH_ALIAS_SET.has(t)) {
    return { kind: "ok", period: "month", coercedFrom: t };
  }

  return {
    kind: "error",
    message: `priceOptions.period는 day|week|biweekly|month 만 허용합니다 (받은 값: "${t}"). "1개월"/"월"/"monthly"는 month로 저장됩니다.`,
    raw: t,
  };
}

export function formatPriceOptionPeriodWriteError(
  index: number,
  message: string,
): string {
  return `가격 옵션[${index}]: ${message}`;
}
