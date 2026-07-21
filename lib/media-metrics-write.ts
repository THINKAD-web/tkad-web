/**
 * Admin/CSV 매체 메트릭 쓰기 검증.
 * 표시 SSOT(`lib/media-metrics.ts`)와 분리 — 저장 경로 재발 방지용.
 */
import { estimateCatalogCpmWon } from "@/lib/media-metrics";

/**
 * 단일 카탈로그 매체 일 유동 하드 상한.
 * - 서울 지하철 최상위 역권 일 이용객 수준(수십만~100만) + DOOH 과대 입력 여유
 * - 네트워크 합산 상한(`NETWORK_DAILY_FOOTFALL_CAP` = 5M)보다 낮음 — 단일 지점용
 */
export const MEDIA_DAILY_FOOTFALL_MAX = 2_000_000;

/** 월 노출 vs 일 유동 경고 배수 (사용자 지시: ×31) */
export const MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS = 31;

/** stored CPM vs 재계산 경고 배율 (10배 이상 이탈) */
export const MEDIA_CPM_MISMATCH_WARN_RATIO = 10;

export type MediaMetricsFieldError = {
  field: "dailyFootfall" | "impressions" | "cpm";
  code:
    | "negative"
    | "not_finite"
    | "daily_footfall_cap"
    | "cpm_negative";
  message: string;
};

export type MediaMetricsFieldWarning = {
  field: "impressions" | "cpm";
  code: "impressions_vs_daily" | "cpm_mismatch";
  message: string;
  details?: Record<string, number | null>;
};

export type MediaMetricsWritePatch = {
  /** undefined = 이번 요청에서 필드 미포함 */
  dailyFootfall?: number | null;
  impressions?: number | null;
  cpm?: number | null;
};

export type MediaMetricsWriteContext = {
  /** PATCH 시 기존 행 / POST 시 같은 바디의 price */
  price?: number | null;
  existingDailyFootfall?: number | null;
  existingImpressions?: number | null;
};

export type MediaMetricsWriteResult = {
  ok: boolean;
  errors: MediaMetricsFieldError[];
  warnings: MediaMetricsFieldWarning[];
  /** 요청에 포함된 필드만 정규화된 값 */
  values: MediaMetricsWritePatch;
};

function coerceNullableInt(
  raw: number | null | undefined,
  field: MediaMetricsFieldError["field"],
  errors: MediaMetricsFieldError[],
): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Number.isFinite(raw)) {
    errors.push({
      field,
      code: "not_finite",
      message: `${field} must be a finite number or null`,
    });
    return undefined;
  }
  return Math.round(raw);
}

function coerceNullableFloat(
  raw: number | null | undefined,
  field: MediaMetricsFieldError["field"],
  errors: MediaMetricsFieldError[],
): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Number.isFinite(raw)) {
    errors.push({
      field,
      code: "not_finite",
      message: `${field} must be a finite number or null`,
    });
    return undefined;
  }
  return raw;
}

/**
 * dailyFootfall / impressions / cpm 쓰기 검증.
 * - 하드 거부: 음수, 비유한수, 일 유동 상한 초과
 * - 경고만(저장 허용): 월노출 > 일유동×31, CPM이 재계산과 10배+ 이탈
 */
export function validateMediaMetricsWrite(
  patch: MediaMetricsWritePatch,
  ctx: MediaMetricsWriteContext = {},
): MediaMetricsWriteResult {
  const errors: MediaMetricsFieldError[] = [];
  const warnings: MediaMetricsFieldWarning[] = [];
  const values: MediaMetricsWritePatch = {};

  if ("dailyFootfall" in patch) {
    const n = coerceNullableInt(patch.dailyFootfall, "dailyFootfall", errors);
    if (n !== undefined) {
      if (n != null && n < 0) {
        errors.push({
          field: "dailyFootfall",
          code: "negative",
          message: "dailyFootfall must be >= 0",
        });
      } else if (n != null && n > MEDIA_DAILY_FOOTFALL_MAX) {
        errors.push({
          field: "dailyFootfall",
          code: "daily_footfall_cap",
          message: `dailyFootfall exceeds max ${MEDIA_DAILY_FOOTFALL_MAX.toLocaleString("en-US")} (single media cap)`,
        });
      } else {
        values.dailyFootfall = n;
      }
    }
  }

  if ("impressions" in patch) {
    const n = coerceNullableInt(patch.impressions, "impressions", errors);
    if (n !== undefined) {
      if (n != null && n < 0) {
        errors.push({
          field: "impressions",
          code: "negative",
          message: "impressions must be >= 0",
        });
      } else {
        values.impressions = n;
      }
    }
  }

  if ("cpm" in patch) {
    const n = coerceNullableFloat(patch.cpm, "cpm", errors);
    if (n !== undefined) {
      if (n != null && n < 0) {
        errors.push({
          field: "cpm",
          code: "cpm_negative",
          message: "cpm must be >= 0",
        });
      } else {
        values.cpm = n;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, values };
  }

  const effectiveDaily =
    values.dailyFootfall !== undefined
      ? values.dailyFootfall
      : (ctx.existingDailyFootfall ?? null);
  const effectiveImp =
    values.impressions !== undefined
      ? values.impressions
      : (ctx.existingImpressions ?? null);
  const effectiveCpm =
    values.cpm !== undefined ? values.cpm : undefined;
  const price = ctx.price ?? null;

  if (
    effectiveImp != null &&
    effectiveImp > 0 &&
    effectiveDaily != null &&
    effectiveDaily > 0
  ) {
    const cap = effectiveDaily * MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS;
    if (effectiveImp > cap) {
      warnings.push({
        field: "impressions",
        code: "impressions_vs_daily",
        message: `impressions (${effectiveImp.toLocaleString("en-US")}) exceeds dailyFootfall×${MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS} (${cap.toLocaleString("en-US")}). OTS can exceed unique footfall — confirm before keeping.`,
        details: {
          impressions: effectiveImp,
          dailyFootfall: effectiveDaily,
          warnCap: cap,
        },
      });
    }
  }

  // CPM 직접 입력이 있고, 재계산에 필요한 price+노출이 있을 때만 경고
  if (
    effectiveCpm != null &&
    effectiveCpm > 0 &&
    price != null &&
    price > 0
  ) {
    const recalc = estimateCatalogCpmWon({
      price,
      impressions: effectiveImp ?? undefined,
      dailyFootTraffic: effectiveDaily ?? undefined,
      cpm: undefined,
      monthlyFootTraffic: undefined,
    });
    if (recalc != null && recalc > 0) {
      const ratio = effectiveCpm / recalc;
      if (
        ratio >= MEDIA_CPM_MISMATCH_WARN_RATIO ||
        ratio <= 1 / MEDIA_CPM_MISMATCH_WARN_RATIO
      ) {
        warnings.push({
          field: "cpm",
          code: "cpm_mismatch",
          message: `stored cpm (${Math.round(effectiveCpm).toLocaleString("en-US")}) differs from recalculated (${Math.round(recalc).toLocaleString("en-US")}) by ≥${MEDIA_CPM_MISMATCH_WARN_RATIO}×. Confirm units; value was not auto-replaced.`,
          details: {
            storedCpm: effectiveCpm,
            recalculatedCpm: recalc,
            ratio,
          },
        });
      }
    }
  }

  return { ok: true, errors, warnings, values };
}

/** CSV `노출수` → dailyFootfall 전용 하드 검증 */
export function validateCsvDailyFootfall(
  exposure: number | null,
): MediaMetricsWriteResult {
  return validateMediaMetricsWrite({ dailyFootfall: exposure });
}
