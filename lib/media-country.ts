/**
 * U-series — 매체 국가 코드 (ISO 3166-1 alpha-2).
 * MVP: KR 기본, 해외는 admin 수동 좌표 등록.
 */

export const DEFAULT_MEDIA_COUNTRY = "KR" as const;

export type MediaCountryCode =
  | typeof DEFAULT_MEDIA_COUNTRY
  | "JP"
  | "US"
  | "CN"
  | "SG"
  | "OTHER";

export const MEDIA_COUNTRY_OPTIONS: readonly {
  code: MediaCountryCode;
  labelKo: string;
  labelEn: string;
}[] = [
  { code: "KR", labelKo: "한국", labelEn: "Korea" },
  { code: "JP", labelKo: "일본", labelEn: "Japan" },
  { code: "US", labelKo: "미국", labelEn: "United States" },
  { code: "CN", labelKo: "중국", labelEn: "China" },
  { code: "SG", labelKo: "싱가포르", labelEn: "Singapore" },
  { code: "OTHER", labelKo: "기타", labelEn: "Other" },
] as const;

export function normalizeMediaCountry(raw: unknown): MediaCountryCode {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (s === "KR" || s === "") return "KR";
  if (s === "JP" || s === "US" || s === "CN" || s === "SG") return s;
  if (s === "OTHER") return "OTHER";
  return "OTHER";
}

export function isKoreaMediaCountry(country: string | null | undefined): boolean {
  const c = normalizeMediaCountry(country ?? "KR");
  return c === "KR";
}

export function isPlannerEligibleCountry(country: string | null | undefined): boolean {
  return isKoreaMediaCountry(country);
}

export function mediaNameEnPlaceholder(country: string, isKo: boolean): string {
  if (normalizeMediaCountry(country) === "JP") {
    return isKo ? "예: Shibuya Vision" : "e.g. Shibuya Vision";
  }
  if (!isKoreaMediaCountry(country)) {
    return isKo ? "예: Times Square Digital Board" : "e.g. Times Square Digital Board";
  }
  return isKo ? "예: 강남역 대형 빌보드" : "e.g. Gangnam Station Large Billboard";
}

export function mediaNameKoPlaceholder(country: string): string {
  if (normalizeMediaCountry(country) === "JP") {
    return "예: 시부야 비전";
  }
  if (!isKoreaMediaCountry(country)) {
    return "예: 해외 옥외 매체";
  }
  return "예: 강남역 대형 빌보드";
}

/** 해외 매체 — browse region_main을 억지로 KR taxonomy에 넣지 않음 */
export const OVERSEAS_BROWSE_REGION_MAIN = "overseas" as const;

export function overseasRegionDefaults(country: MediaCountryCode): {
  region: string;
  regionMain: typeof OVERSEAS_BROWSE_REGION_MAIN;
  regionSub: typeof OVERSEAS_BROWSE_REGION_MAIN;
} {
  return {
    region: country === "OTHER" ? "international" : country.toLowerCase(),
    regionMain: OVERSEAS_BROWSE_REGION_MAIN,
    regionSub: OVERSEAS_BROWSE_REGION_MAIN,
  };
}

/**
 * Admin save (POST/PATCH) — country≠KR 일 때 region taxonomy 강제.
 * onChange 없이 저장만 해도 stale regionMain/region_zone 이 덮어써지게 한다.
 */
export function applyOverseasMediaRegionFieldsOnSave(
  country: string | null | undefined,
): {
  region: string;
  regionMain: typeof OVERSEAS_BROWSE_REGION_MAIN;
  regionSub: typeof OVERSEAS_BROWSE_REGION_MAIN;
  regionZone: null;
} {
  const defaults = overseasRegionDefaults(normalizeMediaCountry(country));
  return {
    ...defaults,
    regionZone: null,
  };
}

export function hasValidManualCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}
