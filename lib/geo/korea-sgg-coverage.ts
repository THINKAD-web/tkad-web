/**
 * 이동형 매체 커버리지 — 전국 시·군·구 행정구역코드(5자리) + 대표 중심.
 * 데이터: 행정안전부 법정동 행정구역 경계(vuski/admdongkor, ver20230101)에서 `sgg`별
 * 읍면동 폴리곤 좌표 평균으로 근사 중심을 산출. 경계는 원형 근사 링(시각용)입니다.
 */
import raw from "./korea-sigungu-coverage.json";

export type SigunguCoverage = {
  code: string;
  nameKo: string;
  sidoName: string;
  centerLat: number;
  centerLng: number;
  radiusM: number;
};

/** @deprecated `SigunguCoverage` 사용 — 서울 전용이 아님 */
export type SeoulSigunguCoverage = SigunguCoverage;

export const KOREA_SIGUNGU_COVERAGE = raw as readonly SigunguCoverage[];

const byCode = new Map<string, SigunguCoverage>(
  KOREA_SIGUNGU_COVERAGE.map((r) => [r.code, r]),
);

const bySido = new Map<string, SigunguCoverage[]>();
for (const r of KOREA_SIGUNGU_COVERAGE) {
  const list = bySido.get(r.sidoName) ?? [];
  list.push(r);
  bySido.set(r.sidoName, list);
}
for (const list of bySido.values()) {
  list.sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
}

const SIDO_PRIORITY = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

const prioSet = new Set<string>(SIDO_PRIORITY);

export const KOREA_SIDO_ORDERED: readonly string[] = (() => {
  const names = new Set(KOREA_SIGUNGU_COVERAGE.map((r) => r.sidoName));
  const first = SIDO_PRIORITY.filter((s) => names.has(s));
  const rest = [...names]
    .filter((s) => !prioSet.has(s))
    .sort((a, b) => a.localeCompare(b, "ko"));
  return [...first, ...rest];
})();

export function sigunguListForSido(sidoName: string): readonly SigunguCoverage[] {
  return bySido.get(sidoName) ?? [];
}

/** 서울 25개 구만 (필터·테스트용) */
export const SEOUL_SIGUNGU_COVERAGE: readonly SigunguCoverage[] =
  KOREA_SIGUNGU_COVERAGE.filter((r) => r.sidoName === "서울특별시");

export function getSigunguCoverage(code: string): SigunguCoverage | undefined {
  return byCode.get(code.trim());
}

/** @deprecated `getSigunguCoverage` */
export function getSeoulSigunguCoverage(code: string): SigunguCoverage | undefined {
  return getSigunguCoverage(code);
}

/** GeoJSON Polygon exterior ring: [lng, lat][] (닫힘: 첫점=끝점) */
export function ringLngLatAroundCenter(
  centerLat: number,
  centerLng: number,
  radiusM: number,
  segments = 36,
): [number, number][] {
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.25, cosLat));
  const ring: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * 2 * Math.PI;
    const lat = centerLat + dLat * Math.sin(t);
    const lng = centerLng + dLng * Math.cos(t);
    ring.push([lng, lat]);
  }
  return ring;
}

export type CoverageFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { code: string; nameKo: string };
    geometry: { type: "Polygon"; coordinates: [number, number][][] };
  }>;
};

export function buildMobileDistrictCoverageGeoJson(codes: string[]): CoverageFeatureCollection {
  const seen = new Set<string>();
  const features: CoverageFeatureCollection["features"] = [];
  for (const rawCode of codes) {
    const code = rawCode.trim();
    if (!code || seen.has(code)) continue;
    const row = getSigunguCoverage(code);
    if (!row) continue;
    seen.add(code);
    const ring = ringLngLatAroundCenter(row.centerLat, row.centerLng, row.radiusM);
    features.push({
      type: "Feature",
      properties: { code: row.code, nameKo: row.nameKo },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function isAllowedCoverageDistrictCode(code: string): boolean {
  return byCode.has(code.trim());
}

/** 선택 구들의 단순 무게중심 (대표 좌표 보조용) */
export function centroidOfCoverageCodes(codes: string[]): { lat: number; lng: number } | null {
  const pts: { lat: number; lng: number }[] = [];
  for (const c of codes) {
    const row = getSigunguCoverage(c.trim());
    if (row) pts.push({ lat: row.centerLat, lng: row.centerLng });
  }
  if (!pts.length) return null;
  const s = pts.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: s.lat / pts.length, lng: s.lng / pts.length };
}

/** 시도명을 짧은 지역 라벨로 (도시 필드 자동 채움용) */
export function inferShortRegionLabelFromCodes(codes: string[]): string {
  const first = codes.map((c) => getSigunguCoverage(c)).find(Boolean);
  if (!first) return "";
  return first.sidoName
    .replace(/특별자치시$/, "")
    .replace(/특별자치도$/, "")
    .replace(/특별시$/, "")
    .replace(/광역시$/, "")
    .replace(/도$/, "")
    .trim();
}
