/**
 * Phase 4a-3 — 매체 → 시·군·구 coverageDongs 매핑.
 *
 * Signal sourceKey = MOIS 10자리 행정기관코드 (4a-2).
 * coverageDongs[].code 는 동일 코드체계를 사용한다.
 */
import {
  getBrowseRegionMain,
  getBrowseRegionSub,
  MEDIA_BROWSE_REGIONS,
} from "../media-browse-regions";
import { mapDistrictToMois } from "./district-mois-map";
import type { MoisSigunguRow } from "./mois-population";

export type CoverageDong = {
  code: string;
  weight: number;
};

export type CoverageMapSuccess = {
  ok: true;
  coverageDongs: CoverageDong[];
  /** 커버 구 주민등록 인구 가중 합 (Σ pop×weight) — Reach 모집단 근사 */
  coveragePopulation: number;
  method: string;
  sigunguNames: string[];
};

export type CoverageMapFailure = {
  ok: false;
  reason: string;
};

export type CoverageMapResult = CoverageMapSuccess | CoverageMapFailure;

export type MediaCoverageInput = {
  regionMain: string | null;
  regionSub: string | null;
  district: string | null;
  city: string | null;
  /** FactSheet 좌표 — 4a는 PIP 없음, district 보조만 */
  latitude?: number | null;
  longitude?: number | null;
};

export type MoisPopulationIndex = Map<
  string,
  { population: number; sigunguName: string; sidoName: string }
>;

export function buildMoisPopulationIndex(
  rows: readonly MoisSigunguRow[],
): MoisPopulationIndex {
  return new Map(
    rows.map((r) => [
      r.regionCode,
      { population: r.population, sigunguName: r.sigunguName, sidoName: r.sidoName },
    ]),
  );
}

function equalWeights(rows: readonly MoisSigunguRow[]): CoverageDong[] {
  if (rows.length === 0) return [];
  const w = 1 / rows.length;
  return rows.map((r) => ({ code: r.regionCode, weight: w }));
}

function weightedPopulation(
  dongs: readonly CoverageDong[],
  index: MoisPopulationIndex,
): number {
  let sum = 0;
  for (const d of dongs) {
    const pop = index.get(d.code)?.population ?? 0;
    sum += pop * d.weight;
  }
  return Math.round(sum);
}

function finalize(
  rows: MoisSigunguRow[],
  index: MoisPopulationIndex,
  method: string,
): CoverageMapResult {
  const unique = [...new Map(rows.map((r) => [r.regionCode, r])).values()];
  if (unique.length === 0) return { ok: false, reason: "no_sigungu_rows" };
  const coverageDongs = equalWeights(unique);
  return {
    ok: true,
    coverageDongs,
    coveragePopulation: weightedPopulation(coverageDongs, index),
    method,
    sigunguNames: unique.map((r) => r.sigunguName),
  };
}

/** "강남·서초·분당·영통" → 토큰 */
function parseDotSeparatedDistrict(district: string): string[] {
  return district
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TOKEN_TO_SIGUNGU: Record<string, string> = {
  강남: "강남구",
  서초: "서초구",
  분당: "성남시 분당구",
  영통: "수원시 영통구",
  판교: "성남시 분당구",
  마포: "마포구",
  홍대: "마포구",
  성수: "성동구",
  송파: "송파구",
  잠실: "송파구",
  여의도: "영등포구",
  영등포: "영등포구",
  종로: "종로구",
  중구: "중구",
  용산: "용산구",
  구로: "구로구",
  노원: "노원구",
  수원: "수원시",
  성남: "성남시",
  고양: "고양시",
  용인: "용인시",
  부천: "부천시",
  하남: "하남시",
  김포: "김포시",
  광명: "광명시",
  화성: "화성시",
  동탄: "화성시",
};

function resolveTokenToMois(
  token: string,
  rows: readonly MoisSigunguRow[],
  sidoFilter?: "seoul" | "gyeonggi",
): MoisSigunguRow | null {
  const normalized = TOKEN_TO_SIGUNGU[token] ?? token;
  const r = mapDistrictToMois(normalized, rows);
  if (!r.ok) {
    const withGu = token.endsWith("구") || token.endsWith("시") ? token : `${token}구`;
    const r2 = mapDistrictToMois(withGu, rows);
    if (!r2.ok) return null;
    if (sidoFilter === "seoul" && r2.row.sidoName !== "서울특별시") return null;
    if (sidoFilter === "gyeonggi" && r2.row.sidoName !== "경기도") return null;
    return r2.row;
  }
  if (sidoFilter === "seoul" && r.row.sidoName !== "서울특별시") return null;
  if (sidoFilter === "gyeonggi" && r.row.sidoName !== "경기도") return null;
  return r.row;
}

function filterSidoRows(
  rows: readonly MoisSigunguRow[],
  regionMain: string | null,
): MoisSigunguRow[] {
  if (regionMain === "seoul") {
    return rows.filter((r) => r.sidoName === "서울특별시");
  }
  if (regionMain === "gyeonggi") {
    return rows.filter((r) => r.sidoName === "경기도");
  }
  return [...rows];
}

function tryBroadDistrict(
  district: string,
  regionMain: string | null,
  rows: readonly MoisSigunguRow[],
  index: MoisPopulationIndex,
): CoverageMapResult | null {
  const d = district.trim();

  if (/^서울\s*전역/i.test(d)) {
    return finalize(filterSidoRows(rows, "seoul"), index, "broad_seoul_equal");
  }
  if (/^경기(도)?\s*전역/i.test(d)) {
    return finalize(filterSidoRows(rows, "gyeonggi"), index, "broad_gyeonggi_equal");
  }

  if (/^강남·/.test(d) || d.includes("·")) {
    const tokens = parseDotSeparatedDistrict(d);
    const matched: MoisSigunguRow[] = [];
    for (const t of tokens) {
      const row = resolveTokenToMois(t, rows);
      if (row) matched.push(row);
    }
    if (matched.length > 0) {
      return finalize(matched, index, "district_dot_list_equal");
    }
  }

  return null;
}

/** browse regionSub → MOIS sigungu (alias·라벨 기반) */
export function expandRegionSubToMois(
  regionMain: string | null,
  regionSub: string | null,
  rows: readonly MoisSigunguRow[],
): MoisSigunguRow[] {
  if (!regionMain || !regionSub) return [];
  const sub = getBrowseRegionSub(regionMain, regionSub);
  if (!sub) return [];

  const candidates = new Set<string>();
  for (const part of sub.label.split(/[/·]/)) {
    const p = part.trim();
    if (p) candidates.add(p);
  }
  for (const a of sub.aliases ?? []) {
    candidates.add(a);
  }

  const matched: MoisSigunguRow[] = [];
  const sido = regionMain === "seoul" ? "seoul" : regionMain === "gyeonggi" ? "gyeonggi" : undefined;

  for (const c of candidates) {
    const row = resolveTokenToMois(c, rows, sido);
    if (row) matched.push(row);
    if (c.endsWith("구") || c.endsWith("시")) continue;
    const rowGu = resolveTokenToMois(`${c}구`, rows, sido);
    if (rowGu) matched.push(rowGu);
  }

  // gyeonggi city cluster — 하위 구 전체 (예: 성남 → 3개 구)
  if (regionMain === "gyeonggi") {
    for (const c of candidates) {
      if (!c.endsWith("시") && !["분당", "판교", "일산", "동탄", "영통", "수지", "기흥", "평촌", "미사"].includes(c)) {
        continue;
      }
      const token = TOKEN_TO_SIGUNGU[c] ?? (c.endsWith("시") ? c : null);
      if (!token) continue;
      for (const r of rows) {
        if (r.sidoName !== "경기도") continue;
        if (r.sigunguName.startsWith(token.replace(/시$/, "시"))) {
          matched.push(r);
        }
      }
    }
  }

  return [...new Map(matched.map((r) => [r.regionCode, r])).values()];
}

/** city/district 로 region_main 기대값 추론 (불일치 탐지용) */
export function inferExpectedRegionMain(input: {
  city: string | null;
  district: string | null;
  region: string | null;
}): string | null {
  const hay = [input.city, input.district, input.region].filter(Boolean).join(" ");

  if (/인천|부평|연수|계양|남동|미추홀|옹진|강화/.test(hay)) return "incheon";
  // "서구" 단독·인천 서구만 (강서구 오탐 방지)
  if (
    /인천\s*서구/.test(hay) ||
    /(?:^|[\s,])서구(?:$|[\s,])/.test(hay)
  ) {
    if (!/강서/.test(hay)) return "incheon";
  }
  if (/부산|해운대|서면|남포/.test(hay)) return "busan";
  if (/대구|동성로/.test(hay)) return "daegu";
  if (/대전|둔산|유성/.test(hay)) return "daejeon";
  if (/광주(?!\s*역)/.test(hay) && !/경기|광주시/.test(hay)) return "gwangju";
  if (/울산/.test(hay)) return "ulsan";
  if (/제주/.test(hay)) return "jeju";
  if (/세종/.test(hay)) return "chungcheong";

  if (/서울|종로|강남|마포|송파|용산|영등포|성동|광진|동대문|중랑|성북|강북|도봉|노원|은평|서대문|양천|강서|구로|금천|동작|관악|서초|강동/.test(hay)) {
    return "seoul";
  }

  if (
    /경기|수원|성남|고양|용인|부천|안양|안산|남양주|화성|평택|시흥|파주|의정부|광명|김포|군포|광주시|이천|양주|오산|구리|안성|포천|의왕|하남|여주|양평|동두천|과천|가평|연천/.test(
      hay,
    )
  ) {
    return "gyeonggi";
  }

  return null;
}

export function isRegionMainMismatch(input: {
  regionMain: string | null;
  city: string | null;
  district: string | null;
  region: string | null;
}): { mismatch: boolean; expected: string | null } {
  const rm = input.regionMain?.trim().toLowerCase() ?? null;
  if (rm !== "seoul" && rm !== "gyeonggi") {
    return { mismatch: false, expected: null };
  }
  const expected = inferExpectedRegionMain(input);
  if (!expected) return { mismatch: false, expected: null };
  if (expected === rm) return { mismatch: false, expected };
  return { mismatch: true, expected };
}

/**
 * 매체 → coverageDongs 매핑 (우선순위: district → broad/multi → regionSub).
 */
export function resolveMediaCoverage(
  input: MediaCoverageInput,
  moisRows: readonly MoisSigunguRow[],
  index: MoisPopulationIndex,
): CoverageMapResult {
  const regionMain = input.regionMain?.trim().toLowerCase() ?? null;
  if (regionMain !== "seoul" && regionMain !== "gyeonggi") {
    return { ok: false, reason: "not_seoul_gyeonggi" };
  }

  const { mismatch, expected } = isRegionMainMismatch({
    regionMain: input.regionMain,
    city: input.city,
    district: input.district,
    region: null,
  });
  if (mismatch) {
    return {
      ok: false,
      reason: `region_main_mismatch(expected=${expected})`,
    };
  }

  const district = input.district?.trim() ?? "";

  // 1순위 — district 직접 (단일 구)
  if (district) {
    const broad = tryBroadDistrict(district, regionMain, moisRows, index);
    if (broad) return broad;

    const direct = mapDistrictToMois(district, moisRows);
    if (direct.ok) {
      return finalize([direct.row], index, `district_${direct.method}`);
    }

    // "성동구 외 다수" / "강남구 등" — regionSub 폴백 시도 (아래)
    if (direct.reason !== "skip_broad_coverage") {
      // no_mois_match — fall through to regionSub
    }
  }

  // 2순위 — regionSub 클러스터
  const fromSub = expandRegionSubToMois(regionMain, input.regionSub, moisRows);
  if (fromSub.length > 0) {
    return finalize(fromSub, index, "region_sub_cluster_equal");
  }

  // 3순위 — ambiguous district + no regionSub: 제외
  if (district && /외\s*다수|등$|^다수$/.test(district)) {
    return { ok: false, reason: "ambiguous_district_no_regionsub" };
  }

  if (!district && !input.regionSub) {
    return { ok: false, reason: "no_district_or_regionsub" };
  }

  return { ok: false, reason: "mapping_failed" };
}

/** 전체 MOIS rows (서울·경기) — dry-run·테스트용 */
export function listSeoulGyeonggiFromIndex(index: MoisPopulationIndex): string[] {
  return [...index.keys()];
}

export { MEDIA_BROWSE_REGIONS };
