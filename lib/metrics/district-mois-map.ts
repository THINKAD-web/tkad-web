/**
 * Media.district / browse regionSub → MOIS 시·군·구 매핑 (Phase 4a).
 *
 * regionSub는 browse 마�eting 클러스터(seoul_gangnam)이고 MOIS는 행정구(강남구)다.
 * 4a-2 Signal은 MOIS 행정 단위, 4a-3에서 매체→구 매핑 시 district 우선.
 */
import type { MoisSigunguRow } from "./mois-population";

export type DistrictMapResult =
  | { ok: true; row: MoisSigunguRow; method: string }
  | { ok: false; district: string; reason: string };

const SKIP_DISTRICT_PATTERNS = [
  /^서울\s*전역/i,
  /^경기(도)?\s*전역/i,
  /^전국/i,
  /^다수$/i,
  /외\s*다수/i,
  /등$/,
  /^강남·/,
];

function normalizeDistrict(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function indexMoisRows(rows: readonly MoisSigunguRow[]) {
  const bySigungu = new Map<string, MoisSigunguRow>();
  const byFull = new Map<string, MoisSigunguRow>();
  for (const row of rows) {
    bySigungu.set(row.sigunguName, row);
    byFull.set(row.regionName, row);
    if (row.sidoName === "서울특별시") {
      bySigungu.set(row.sigunguName.replace(/구$/, "") + "구", row);
    }
  }
  return { bySigungu, byFull };
}

export function mapDistrictToMois(
  district: string | null | undefined,
  rows: readonly MoisSigunguRow[],
): DistrictMapResult {
  const d = normalizeDistrict(district ?? "");
  if (!d) return { ok: false, district: d, reason: "empty_district" };

  for (const pat of SKIP_DISTRICT_PATTERNS) {
    if (pat.test(d)) return { ok: false, district: d, reason: "skip_broad_coverage" };
  }

  const { bySigungu, byFull } = indexMoisRows(rows);

  if (byFull.has(`서울특별시 ${d}`)) {
    return { ok: true, row: byFull.get(`서울특별시 ${d}`)!, method: "seoul_full" };
  }
  if (byFull.has(`경기도 ${d}`)) {
    return { ok: true, row: byFull.get(`경기도 ${d}`)!, method: "gyeonggi_full" };
  }
  if (bySigungu.has(d)) {
    return { ok: true, row: bySigungu.get(d)!, method: "sigungu_exact" };
  }

  // "성남시 분당구", "부천시 원미구", "고양시 일산동구"
  const cityGu = d.match(/^(.+시)\s+(.+구)$/);
  if (cityGu && bySigungu.has(`${cityGu[1]} ${cityGu[2]}`)) {
    return {
      ok: true,
      row: bySigungu.get(`${cityGu[1]} ${cityGu[2]}`)!,
      method: "city_gu",
    };
  }

  // "고양시 덕양구" vs MOIS "고양시 덕양구"
  for (const row of rows) {
    if (row.sigunguName === d) {
      return { ok: true, row, method: "sigungu_scan" };
    }
    if (d.endsWith(row.sigunguName) || row.sigunguName.endsWith(d)) {
      return { ok: true, row, method: "sigungu_suffix" };
    }
  }

  // 단일 구 이름만 포함
  const guOnly = d.match(/([가-힣]+구)$/);
  if (guOnly && bySigungu.has(guOnly[1])) {
    return { ok: true, row: bySigungu.get(guOnly[1])!, method: "gu_tail" };
  }

  return { ok: false, district: d, reason: "no_mois_match" };
}

export function auditDistrictMappings(
  districts: readonly string[],
  rows: readonly MoisSigunguRow[],
): {
  mapped: Array<{ district: string; regionCode: string; sigunguName: string; method: string }>;
  failed: Array<{ district: string; reason: string }>;
  skipped: Array<{ district: string; reason: string }>;
} {
  const mapped: Array<{
    district: string;
    regionCode: string;
    sigunguName: string;
    method: string;
  }> = [];
  const failed: Array<{ district: string; reason: string }> = [];
  const skipped: Array<{ district: string; reason: string }> = [];

  for (const district of districts) {
    const r = mapDistrictToMois(district, rows);
    if (r.ok) {
      mapped.push({
        district,
        regionCode: r.row.regionCode,
        sigunguName: r.row.sigunguName,
        method: r.method,
      });
    } else if (r.reason === "skip_broad_coverage" || r.reason === "empty_district") {
      skipped.push({ district, reason: r.reason });
    } else {
      failed.push({ district, reason: r.reason });
    }
  }

  return { mapped, failed, skipped };
}
