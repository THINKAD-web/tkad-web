/** Client-safe network footfall helpers (no Prisma / Node DB deps). */

/** 네트워크 일일 유동 상한 — 지점 합산 과대 추정 방지 (프라임오피스급) */
export const NETWORK_DAILY_FOOTFALL_CAP = 5_000_000;

/**
 * 데이터 없을 때 정렬·CPM·추천에서 0으로 탈락하지 않도록 하는 최소 일 유동.
 * 스포애니 등 footfall 미입력 네트워크용.
 */
export const NETWORK_DAILY_FOOTFALL_FLOOR = 1_000;

export type NetworkFootfallInput = {
  dailyFootfall: number | null;
  totalLocations: number | null;
  locations: ReadonlyArray<{
    dailyFootfall: number | null;
    unitCount: number | null;
  }>;
};

/**
 * 네트워크 일일 유동 추정 — 지점 합산·unitCount 스케일, DB 단일값 병합.
 *
 * - 지점 `dailyFootfall`은 **지점(사이트) 일 유동**으로 간주해 합산 (평균 X).
 * - `totalLocations` > 합산에 포함된 unit 수이면 전체 규모로 스케일업.
 * - DB `dailyFootfall`이 있고 지점 합이 5배 초과면 운영자 DB 우선 (중복 합산 방지).
 * - 그 외 DB·지점 합 중 큰 값.
 */
export function computeNetworkDailyFootfall(n: NetworkFootfallInput): number {
  const locs = n.locations ?? [];

  const locSum = locs.reduce(
    (s, l) => s + Math.max(0, l.dailyFootfall ?? 0),
    0,
  );

  const locsWithFootfall = locs.filter((l) => (l.dailyFootfall ?? 0) > 0);
  const unitsRepresented = locsWithFootfall.reduce(
    (s, l) => s + Math.max(1, l.unitCount ?? 1),
    0,
  );
  const totalUnits =
    n.totalLocations != null && n.totalLocations > 0
      ? n.totalLocations
      : locs.reduce((s, l) => s + Math.max(1, l.unitCount ?? 1), 0) ||
        locs.length;

  let fromLocations = locSum;
  if (
    locSum > 0 &&
    unitsRepresented > 0 &&
    totalUnits > unitsRepresented
  ) {
    fromLocations = Math.round(locSum * (totalUnits / unitsRepresented));
  }

  const dbVal =
    n.dailyFootfall != null && n.dailyFootfall > 0 ? n.dailyFootfall : 0;

  let result = 0;
  if (dbVal > 0 && fromLocations > 0) {
    if (fromLocations > dbVal * 5) {
      result = dbVal;
    } else {
      result = Math.max(dbVal, fromLocations);
    }
  } else if (dbVal > 0) {
    result = dbVal;
  } else if (fromLocations > 0) {
    result = fromLocations;
  } else {
    result = NETWORK_DAILY_FOOTFALL_FLOOR;
  }

  return Math.min(
    NETWORK_DAILY_FOOTFALL_CAP,
    Math.max(0, Math.round(result)),
  );
}
