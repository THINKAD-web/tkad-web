/**
 * R-01 per-unit traffic — vehicle(대) 기준 divisor 도출.
 * 임의 "대당 N면" 가정 금지. 면/구좌만 있고 차량 대수 근거 없으면 Track D.
 */
import {
  BUS_DEFAULT_EXPOSURE_PER_TRIP,
  BUS_DEFAULT_ROUND_TRIPS_PER_DAY,
  PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT,
} from "./constants.ts";
import type { MediaMetricClass } from "./types.ts";

export const BUS_PER_VEHICLE_FALLBACK_D02 =
  BUS_DEFAULT_ROUND_TRIPS_PER_DAY * BUS_DEFAULT_EXPOSURE_PER_TRIP;

export type R01PerUnitConfidence = "confirmed" | "estimate";

export type R01PerUnitResolution =
  | {
      track: "evidence_parsed";
      confidence: "confirmed";
      proposedDailyFootfall: number;
      proposedSellingUnit: "vehicle";
      estimationBasis: string;
      estimationDetail: Record<string, unknown>;
      wouldClearR01: boolean;
    }
  | {
      track: "fallback_estimate";
      confidence: "estimate";
      proposedDailyFootfall: number;
      proposedSellingUnit: "vehicle";
      estimationBasis: string;
      estimationDetail: Record<string, unknown>;
      wouldClearR01: boolean;
    }
  | {
      track: "excluded_track_d";
      confidence: "estimate";
      proposedDailyFootfall: null;
      proposedSellingUnit: null;
      estimationBasis: string;
      estimationDetail: Record<string, unknown>;
      wouldClearR01: false;
    };

function parseNumberWithCommas(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** description 에서 명시 차량 대수 (N대) — 최대값 사용 */
export function parseExplicitVehicleCounts(
  text: string,
): Array<{ count: number; sourceText: string }> {
  const out: Array<{ count: number; sourceText: string }> = [];
  const re = /(\d[\d,]*)\s*대/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const count = parseNumberWithCommas(m[1]!);
    if (count == null || count < 2) continue;
    out.push({ count, sourceText: m[0].trim() });
  }
  return out;
}

/**
 * "8,000대의 버스에 2면씩 총 16,000면" — N대와 M면씩이 같은 문맥에 명시된 경우 N대 반환.
 * M만 있고 N대 없으면 null (임의 N=M/2 금지).
 */
export function parseCompoundVehicleFace(text: string): {
  vehicleCount: number;
  facesPerVehicle: number;
  totalFaces?: number;
  sourceText: string;
} | null {
  const compoundRe =
    /(\d[\d,]*)\s*대(?:[^.\n]{0,160}?)(\d[\d,]*)\s*면\s*씩(?:[^.\n]{0,100}?총\s*(\d[\d,]*)\s*면)?/gi;
  let best: ReturnType<typeof parseCompoundVehicleFace> = null;
  let m: RegExpExecArray | null;
  while ((m = compoundRe.exec(text)) !== null) {
    const vehicleCount = parseNumberWithCommas(m[1]!);
    const facesPerVehicle = parseNumberWithCommas(m[2]!);
    if (vehicleCount == null || facesPerVehicle == null) continue;
    if (vehicleCount < 2) continue;
    const totalFaces = m[3] ? parseNumberWithCommas(m[3]) : undefined;
    if (
      totalFaces != null &&
      Math.abs(vehicleCount * facesPerVehicle - totalFaces) >
        Math.max(1, totalFaces * 0.05)
    ) {
      continue;
    }
    if (!best || vehicleCount > best.vehicleCount) {
      best = {
        vehicleCount,
        facesPerVehicle,
        totalFaces: totalFaces ?? undefined,
        sourceText: m[0].trim().slice(0, 120),
      };
    }
  }
  return best;
}

function resolveVehicleDivisorCount(text: string): {
  vehicleCount: number;
  basis: string;
  detail: Record<string, unknown>;
} | null {
  const compound = parseCompoundVehicleFace(text);
  if (compound) {
    return {
      vehicleCount: compound.vehicleCount,
      basis: `차량 대수 명시(복합): "${compound.sourceText}" → ${compound.vehicleCount.toLocaleString()}대 (판매단위=vehicle)`,
      detail: { compound, divisorUnit: "vehicle" },
    };
  }

  const vehicles = parseExplicitVehicleCounts(text);
  if (vehicles.length > 0) {
    const max = vehicles.reduce((a, b) => (b.count > a.count ? b : a));
    return {
      vehicleCount: max.count,
      basis: `description 차량 대수: "${max.sourceText}" → ${max.count.toLocaleString()}대 (판매단위=vehicle)`,
      detail: { vehicleMatches: vehicles, chosen: max, divisorUnit: "vehicle" },
    };
  }

  return null;
}

/** 면/구좌만 있고 차량 대수 없음 → Track D (v2 오탐 방지) */
function hasFaceOrSlotWithoutVehicle(text: string): boolean {
  if (parseExplicitVehicleCounts(text).length > 0) return false;
  if (parseCompoundVehicleFace(text)) return false;
  if (/\d[\d,]*\s*면\s*(?:씩|이\s*운영|운영)/.test(text)) return true;
  if (/총\s*\d[\d,]*\s*면/.test(text)) return true;
  if (/\d[\d,]*\s*구좌/.test(text)) return true;
  if (/\d[\d,]*\s*기(?:의|가|\s)/.test(text)) return true;
  return false;
}

export function resolveR01PerUnitTraffic(params: {
  mediaClass: MediaMetricClass;
  dailyFootfall: number;
  description: string | null;
  priceNote: string | null;
  name?: string;
}): R01PerUnitResolution {
  const hay = [params.description, params.priceNote, params.name]
    .filter(Boolean)
    .join("\n");
  const daily = params.dailyFootfall;
  const ceiling = PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT[params.mediaClass];

  if (hasFaceOrSlotWithoutVehicle(hay)) {
    return {
      track: "excluded_track_d",
      confidence: "estimate",
      proposedDailyFootfall: null,
      proposedSellingUnit: null,
      estimationBasis:
        "면/구좌/기 수만 있고 차량 대수(N대) 근거 없음 — 임의 대당 면수 가정 금지, Track D",
      estimationDetail: { reason: "face_or_slot_without_vehicle" },
      wouldClearR01: false,
    };
  }

  const vehicleDiv = resolveVehicleDivisorCount(hay);
  if (vehicleDiv) {
    const perUnit = Math.round(daily / vehicleDiv.vehicleCount);
    return {
      track: "evidence_parsed",
      confidence: "confirmed",
      proposedDailyFootfall: perUnit,
      proposedSellingUnit: "vehicle",
      estimationBasis: `${vehicleDiv.basis} → ${daily.toLocaleString()} ÷ ${vehicleDiv.vehicleCount.toLocaleString()} = ${perUnit.toLocaleString()}/대·일`,
      estimationDetail: {
        ...vehicleDiv.detail,
        formula: `${daily} / ${vehicleDiv.vehicleCount}`,
      },
      wouldClearR01: perUnit <= ceiling,
    };
  }

  if (params.mediaClass === "bus_exterior") {
    return {
      track: "fallback_estimate",
      confidence: "estimate",
      proposedDailyFootfall: BUS_PER_VEHICLE_FALLBACK_D02,
      proposedSellingUnit: "vehicle",
      estimationBasis: `[추정] 버스 1대 일 OTS 업계 기본값 (D-02): ${BUS_DEFAULT_ROUND_TRIPS_PER_DAY}왕복 × ${BUS_DEFAULT_EXPOSURE_PER_TRIP.toLocaleString()}명 = ${BUS_PER_VEHICLE_FALLBACK_D02.toLocaleString()}/대·일 — description에 차량 fleet 수 없음`,
      estimationDetail: {
        fallback: "bus_exterior_d02_default",
        roundTripsPerDay: BUS_DEFAULT_ROUND_TRIPS_PER_DAY,
        exposurePerTrip: BUS_DEFAULT_EXPOSURE_PER_TRIP,
      },
      wouldClearR01: BUS_PER_VEHICLE_FALLBACK_D02 <= ceiling,
    };
  }

  return {
    track: "excluded_track_d",
    confidence: "estimate",
    proposedDailyFootfall: null,
    proposedSellingUnit: null,
    estimationBasis:
      "차량 대수 근거 없음 + bus_exterior fallback 미적용 — Track D (사람 확인)",
    estimationDetail: {
      reason: "no_vehicle_divisor_no_fallback",
      mediaClass: params.mediaClass,
    },
    wouldClearR01: false,
  };
}

export function isDoohOversizedForR01(
  mediaClass: MediaMetricClass,
  daily: number,
): boolean {
  const ceiling = PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT[mediaClass];
  return (
    (mediaClass.startsWith("dooh") || mediaClass === "static_other") &&
    daily > ceiling
  );
}
