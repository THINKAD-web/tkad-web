/**
 * Admin/CSV 매체 메트릭 쓰기 검증.
 * 표시 SSOT(`lib/media-metrics.ts`)와 분리 — 저장 경로 재발 방지용.
 *
 * Phase A (#411): class impressions cap · CPM 3× warn / 10× error ·
 * placeholder CPM · Package 키워드 · warnings ack 게이트.
 */
import { estimateCatalogCpmWon } from "@/lib/media-metrics";
import { NETWORK_DAILY_FOOTFALL_CAP } from "@/lib/media-network-footfall";
import { classifyMedia } from "@/lib/metrics/classify";
import type { MediaMetricClass } from "@/lib/metrics/types";

/**
 * 단일 카탈로그 매체 일 유동 하드 상한.
 * - 서울 지하철 최상위 역권 일 이용객 수준(수십만~100만) + DOOH 과대 입력 여유
 * - 네트워크 합산 상한(`NETWORK_DAILY_FOOTFALL_CAP` = 5M)보다 낮음 — 단일 지점용
 */
export const MEDIA_DAILY_FOOTFALL_MAX = 2_000_000;

/** 월 노출 vs 일 유동 경고 배수 (사용자 지시: ×31) */
export const MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS = 31;

/** stored CPM vs 재계산 — 이 배율부터 경고 (재한 확정) */
export const MEDIA_CPM_MISMATCH_WARN_RATIO = 3;

/** stored CPM vs 재계산 — 이 배율부터 하드 거부 (재한 확정) */
export const MEDIA_CPM_MISMATCH_ERROR_RATIO = 10;

/** ₩1~₩10 stored CPM 을 placeholder 로 본다 (재한 확정) */
export const MEDIA_CPM_PLACEHOLDER_MAX = 10;

/** PKG 키워드 + 과대 노출 경고 임계 (월 노출) */
export const MEDIA_PACKAGE_IMPRESSIONS_WARN = 1_000_000;

/** PKG 키워드 + 과대 일 유동 경고 임계 */
export const MEDIA_PACKAGE_DAILY_FOOTFALL_WARN = 200_000;

export const METRICS_WARNINGS_HTTP_CODE = "metrics_warnings";

/**
 * 클래스별 월 노출 하드 상한 (판매단위 1개 기준).
 * bus_exterior 2M 은 재한 확정. 나머지는 PLAUSIBLE_DAILY × 30 의 약 ½~⅓
 * (네트워크·패키지 오입력을 막되 대형 단일 면은 통과).
 */
export const MEDIA_MONTHLY_IMPRESSIONS_CAP: Record<MediaMetricClass, number> = {
  bus_exterior: 2_000_000,
  bus_shelter: 5_000_000,
  elevator_tv: 2_000_000,
  subway_psd: 15_000_000,
  subway_light: 15_000_000,
  dooh_large: 20_000_000,
  dooh_mid: 8_000_000,
  airport: 10_000_000,
  static_other: 15_000_000,
};

export const PACKAGE_NETWORK_KEYWORD_RE =
  /package|\bpkg\b|turn[\s-]*key|턴키|풀\s*패키지|full\s*package|네트워크\s*전체|노선\s*전체|시\/군\s*판매|통합\s*(패키지|판매|상품|역)?/i;

export type MediaMetricsFieldError = {
  field: "dailyFootfall" | "impressions" | "cpm";
  code:
    | "negative"
    | "not_finite"
    | "daily_footfall_cap"
    | "cpm_negative"
    | "impressions_class_cap"
    | "cpm_mismatch"
    | "package_network_scale";
  message: string;
  details?: Record<string, number | string | null>;
};

export type MediaMetricsFieldWarning = {
  field: "impressions" | "cpm" | "dailyFootfall";
  code:
    | "impressions_vs_daily"
    | "cpm_mismatch"
    | "cpm_placeholder"
    | "package_network_scale";
  message: string;
  details?: Record<string, number | string | null>;
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
  existingCpm?: number | null;
  name?: string | null;
  description?: string | null;
  priceNote?: string | null;
  priceOptions?: unknown;
  type?: string | null;
  mainCategory?: string | null;
  subCategory?: string | null;
  widthM?: number | null;
  heightM?: number | null;
};

export type MediaMetricsWriteResult = {
  ok: boolean;
  errors: MediaMetricsFieldError[];
  warnings: MediaMetricsFieldWarning[];
  /** 요청에 포함된 필드만 정규화된 값 */
  values: MediaMetricsWritePatch;
};

export type MetricsWriteGate =
  | {
      kind: "error";
      status: 400;
      result: MediaMetricsWriteResult;
    }
  | {
      kind: "needs_ack";
      status: 409;
      result: MediaMetricsWriteResult;
    }
  | {
      kind: "ok";
      result: MediaMetricsWriteResult;
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

export function classifyForMetricsWrite(
  ctx: MediaMetricsWriteContext,
): MediaMetricClass {
  return classifyMedia({
    mainCategory: ctx.mainCategory,
    subCategory: ctx.subCategory,
    type: ctx.type,
    name: ctx.name,
    widthM: ctx.widthM,
    heightM: ctx.heightM,
  });
}

export function monthlyImpressionsCapForClass(
  mediaClass: MediaMetricClass,
): number {
  return MEDIA_MONTHLY_IMPRESSIONS_CAP[mediaClass];
}

export function detectPackageNetworkKeyword(
  haystack: string | null | undefined,
): boolean {
  if (!haystack) return false;
  return PACKAGE_NETWORK_KEYWORD_RE.test(haystack);
}

export function metricsHaystackFromContext(
  ctx: MediaMetricsWriteContext,
): string {
  const optionLabels: string[] = [];
  if (Array.isArray(ctx.priceOptions)) {
    for (const o of ctx.priceOptions) {
      if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        optionLabels.push(String(r.label ?? ""), String(r.description ?? ""));
      }
    }
  }
  return [
    ctx.name,
    ctx.description?.slice(0, 400),
    ctx.priceNote,
    ...optionLabels,
  ]
    .filter(Boolean)
    .join(" ");
}

function cpmMagnitude(stored: number, recalc: number): number {
  if (stored <= 0 || recalc <= 0) return 1;
  const ratio = stored / recalc;
  return Math.max(ratio, 1 / ratio);
}

/**
 * dailyFootfall / impressions / cpm 쓰기 검증.
 * - 하드 거부: 음수, 비유한수, 일 유동 상한, 클래스 월노출 상한, CPM ≥10×
 * - 경고(ack 후 저장): 월노출 > 일유동×31, CPM ≥3×, placeholder ₩1~10, PKG+과대
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

  const writingImpressions = "impressions" in patch;
  const writingCpm = "cpm" in patch;

  const effectiveDaily =
    values.dailyFootfall !== undefined
      ? values.dailyFootfall
      : (ctx.existingDailyFootfall ?? null);
  const effectiveImp =
    values.impressions !== undefined
      ? values.impressions
      : (ctx.existingImpressions ?? null);
  const effectiveCpm =
    values.cpm !== undefined ? values.cpm : (ctx.existingCpm ?? undefined);
  const price = ctx.price ?? null;

  const mediaClass = classifyForMetricsWrite(ctx);
  const impressionsCap = monthlyImpressionsCapForClass(mediaClass);

  if (
    writingImpressions &&
    values.impressions != null &&
    values.impressions > impressionsCap
  ) {
    errors.push({
      field: "impressions",
      code: "impressions_class_cap",
      message: `impressions (${values.impressions.toLocaleString("en-US")}) exceeds ${mediaClass} monthly cap ${impressionsCap.toLocaleString("en-US")}`,
      details: {
        impressions: values.impressions,
        cap: impressionsCap,
        mediaClass,
      },
    });
  }

  if (
    writingCpm &&
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
      if (
        effectiveCpm >= 1 &&
        effectiveCpm <= MEDIA_CPM_PLACEHOLDER_MAX &&
        recalc > MEDIA_CPM_PLACEHOLDER_MAX
      ) {
        warnings.push({
          field: "cpm",
          code: "cpm_placeholder",
          message: `stored cpm ₩${Math.round(effectiveCpm).toLocaleString("en-US")} looks like a placeholder (₩1–₩${MEDIA_CPM_PLACEHOLDER_MAX}); recalculated ₩${Math.round(recalc).toLocaleString("en-US")}.`,
          details: {
            storedCpm: effectiveCpm,
            recalculatedCpm: recalc,
          },
        });
      }

      const mag = cpmMagnitude(effectiveCpm, recalc);
      if (mag >= MEDIA_CPM_MISMATCH_ERROR_RATIO) {
        errors.push({
          field: "cpm",
          code: "cpm_mismatch",
          message: `stored cpm (${Math.round(effectiveCpm).toLocaleString("en-US")}) differs from recalculated (${Math.round(recalc).toLocaleString("en-US")}) by ≥${MEDIA_CPM_MISMATCH_ERROR_RATIO}×.`,
          details: {
            storedCpm: effectiveCpm,
            recalculatedCpm: recalc,
            ratio: mag,
          },
        });
      } else if (mag >= MEDIA_CPM_MISMATCH_WARN_RATIO) {
        warnings.push({
          field: "cpm",
          code: "cpm_mismatch",
          message: `stored cpm (${Math.round(effectiveCpm).toLocaleString("en-US")}) differs from recalculated (${Math.round(recalc).toLocaleString("en-US")}) by ≥${MEDIA_CPM_MISMATCH_WARN_RATIO}×. Confirm units; value was not auto-replaced.`,
          details: {
            storedCpm: effectiveCpm,
            recalculatedCpm: recalc,
            ratio: mag,
          },
        });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, values };
  }

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

  const haystack = metricsHaystackFromContext(ctx);
  if (detectPackageNetworkKeyword(haystack)) {
    const overImp =
      effectiveImp != null && effectiveImp >= MEDIA_PACKAGE_IMPRESSIONS_WARN;
    const overDaily =
      effectiveDaily != null &&
      effectiveDaily >= MEDIA_PACKAGE_DAILY_FOOTFALL_WARN;
    if (overImp || overDaily) {
      warnings.push({
        field: overImp ? "impressions" : "dailyFootfall",
        code: "package_network_scale",
        message:
          "Package/PKG/Turn-Key/통합 등 키워드와 과대 노출·유동이 함께 있습니다. 네트워크 전체 규모를 판매단위 1개에 넣은 것은 아닌지 확인하세요.",
        details: {
          impressions: effectiveImp,
          dailyFootfall: effectiveDaily,
          mediaClass,
        },
      });
    }
  }

  return { ok: true, errors, warnings, values };
}

export function gateMediaMetricsWrite(
  result: MediaMetricsWriteResult,
  opts: {
    acknowledgeWarnings?: boolean;
    /**
     * false = CSV/bulk 등 비대화형.
     * error 는 해당 행만 실패(배치 전체 롤백 아님). 경고 기본은 저장 허용.
     */
    requireAckForWarnings?: boolean;
    /**
     * 비대화형에서 Package/PKG+과대 규모 경고를 하드 거부로 승격.
     * (확인 모달이 없어 경고만 두면 Full Package+1.6M footfall 이 CSV로 재유입됨)
     */
    rejectPackageScaleOnBatch?: boolean;
  } = {},
): MetricsWriteGate {
  if (!result.ok || result.errors.length > 0) {
    return { kind: "error", status: 400, result };
  }
  if (
    opts.rejectPackageScaleOnBatch &&
    result.warnings.some((w) => w.code === "package_network_scale")
  ) {
    return {
      kind: "error",
      status: 400,
      result: {
        ...result,
        ok: false,
        errors: [
          ...result.errors,
          {
            field: "impressions",
            code: "package_network_scale",
            message:
              "Package/PKG/Turn-Key + oversized traffic/impressions cannot be saved via CSV/bulk-import. Confirm in the admin form, or wait for Phase B sellingUnit.",
          },
        ],
      },
    };
  }
  const requireAck = opts.requireAckForWarnings !== false;
  if (
    requireAck &&
    result.warnings.length > 0 &&
    !opts.acknowledgeWarnings
  ) {
    return { kind: "needs_ack", status: 409, result };
  }
  return { kind: "ok", result };
}

export function metricsWriteErrorBody(result: MediaMetricsWriteResult): {
  error: string;
  errors: MediaMetricsFieldError[];
  warnings: MediaMetricsFieldWarning[];
} {
  return {
    error: result.errors.map((e) => e.message).join("; ") || "Invalid metrics",
    errors: result.errors,
    warnings: result.warnings,
  };
}

export function metricsWriteNeedsAckBody(result: MediaMetricsWriteResult): {
  error: string;
  code: typeof METRICS_WARNINGS_HTTP_CODE;
  warnings: MediaMetricsFieldWarning[];
} {
  return {
    error:
      "메트릭 경고가 있습니다. 내용을 확인한 뒤 다시 저장해 주세요.",
    code: METRICS_WARNINGS_HTTP_CODE,
    warnings: result.warnings,
  };
}

export function isMetricsWarningsPayload(data: unknown): data is {
  code: typeof METRICS_WARNINGS_HTTP_CODE;
  warnings: MediaMetricsFieldWarning[];
  error?: string;
} {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.code === METRICS_WARNINGS_HTTP_CODE &&
    Array.isArray(o.warnings)
  );
}

export function readAcknowledgeMetricsWarnings(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return (body as { acknowledgeMetricsWarnings?: unknown })
    .acknowledgeMetricsWarnings === true;
}

/** CSV `노출수` → dailyFootfall 전용 하드 검증 */
export function validateCsvDailyFootfall(
  exposure: number | null,
  ctx: MediaMetricsWriteContext = {},
): MediaMetricsWriteResult {
  return validateMediaMetricsWrite({ dailyFootfall: exposure }, ctx);
}

export type MappedMediaMetricsFields = {
  dailyFootfall?: number | null;
  impressions?: number | null;
  cpm?: number | null;
  price?: number | null;
  name?: string | null;
  description?: string | null;
  priceNote?: string | null;
  priceOptions?: unknown;
  type?: string | null;
  subCategory?: string | null;
  widthM?: number | null;
  heightM?: number | null;
};

export function validateMappedMediaMetrics(
  mapped: MappedMediaMetricsFields,
  existing?: {
    dailyFootfall?: number | null;
    impressions?: number | null;
    cpm?: number | null;
  },
): MediaMetricsWriteResult {
  const patch: MediaMetricsWritePatch = {};
  if (mapped.dailyFootfall !== undefined) {
    patch.dailyFootfall = mapped.dailyFootfall;
  }
  if (mapped.impressions !== undefined) {
    patch.impressions = mapped.impressions;
  }
  if (mapped.cpm !== undefined) {
    patch.cpm = mapped.cpm;
  }
  return validateMediaMetricsWrite(patch, {
    price: mapped.price ?? null,
    existingDailyFootfall: existing?.dailyFootfall,
    existingImpressions: existing?.impressions,
    existingCpm: existing?.cpm,
    name: mapped.name,
    description: mapped.description,
    priceNote: mapped.priceNote,
    priceOptions: mapped.priceOptions,
    type: mapped.type,
    subCategory: mapped.subCategory,
    widthM: mapped.widthM,
    heightM: mapped.heightM,
  });
}

export function validateNetworkAggregateFootfall(
  dailyFootfall: number | null | undefined,
): MediaMetricsWriteResult {
  if (dailyFootfall == null) {
    return { ok: true, errors: [], warnings: [], values: {} };
  }
  if (!Number.isFinite(dailyFootfall)) {
    return {
      ok: false,
      errors: [
        {
          field: "dailyFootfall",
          code: "not_finite",
          message: "dailyFootfall must be a finite number or null",
        },
      ],
      warnings: [],
      values: {},
    };
  }
  const n = Math.round(dailyFootfall);
  if (n < 0) {
    return {
      ok: false,
      errors: [
        {
          field: "dailyFootfall",
          code: "negative",
          message: "dailyFootfall must be >= 0",
        },
      ],
      warnings: [],
      values: {},
    };
  }
  if (n > NETWORK_DAILY_FOOTFALL_CAP) {
    return {
      ok: false,
      errors: [
        {
          field: "dailyFootfall",
          code: "daily_footfall_cap",
          message: `network dailyFootfall exceeds max ${NETWORK_DAILY_FOOTFALL_CAP.toLocaleString("en-US")}`,
        },
      ],
      warnings: [],
      values: {},
    };
  }
  return {
    ok: true,
    errors: [],
    warnings: [],
    values: { dailyFootfall: n },
  };
}

export function validateNetworkLocationFootfall(
  dailyFootfall: number | null | undefined,
): MediaMetricsWriteResult {
  return validateMediaMetricsWrite({ dailyFootfall: dailyFootfall ?? null });
}
