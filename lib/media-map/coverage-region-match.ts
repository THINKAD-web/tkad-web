import {
  KOREA_SIGUNGU_COVERAGE,
  type SigunguCoverage,
} from "@/lib/geo/korea-sgg-coverage";
import {
  expandMediaRegionChip,
} from "@/lib/media-discovery-filter-chips";
import {
  MEDIA_BROWSE_REGIONS,
  expandBrowseRegionSub,
  getBrowseRegionMain,
} from "@/lib/media-browse-regions";
import { resolveBrowseRegionSubId } from "@/lib/plan-cart-report/region-subdivision";
import type { MediaItem } from "@/lib/media-data";

/** browse `main.id` → 행정안전부 시·도명 */
const BROWSE_MAIN_SIDO_NAMES: Record<string, readonly string[]> = {
  seoul: ["서울특별시"],
  gyeonggi: ["경기도"],
  incheon: ["인천광역시"],
  busan: ["부산광역시"],
  daegu: ["대구광역시"],
  daejeon: ["대전광역시"],
  gwangju: ["광주광역시"],
  ulsan: ["울산광역시"],
  gangwon: ["강원특별자치도", "강원도"],
  jeju: ["제주특별자치도"],
  chungcheong: ["충청북도", "충청남도", "세종특별자치시"],
  gyeongsang: ["경상북도", "경상남도"],
  jeolla: ["전라북도", "전라남도"],
};

export type RegionFilterSigunguCodes =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "codes"; codes: ReadonlySet<string> };

function sidoNamesMatch(a: string, b: string): boolean {
  const na = a.replace(/\s/g, "");
  const nb = b.replace(/\s/g, "");
  return na === nb || na.includes(nb) || nb.includes(na);
}

function sigunguCodesForSidoNames(sidoNames: readonly string[]): Set<string> {
  const codes = new Set<string>();
  for (const row of KOREA_SIGUNGU_COVERAGE) {
    if (sidoNames.some((s) => sidoNamesMatch(row.sidoName, s))) {
      codes.add(row.code);
    }
  }
  return codes;
}

function termMatchesSigungu(term: string, row: SigunguCoverage): boolean {
  const t = term.trim().toLowerCase();
  if (!t || t.length < 2) return false;
  const nameKo = row.nameKo.toLowerCase();
  const sido = row.sidoName.toLowerCase();
  const nameShort = nameKo.replace(/(특별|광역)?(시|군|구)$/g, "");
  return (
    nameKo.includes(t) ||
    sido.includes(t) ||
    t.includes(nameShort) ||
    nameShort.includes(t)
  );
}

function sigunguCodesForSearchTerms(terms: readonly string[]): Set<string> {
  const codes = new Set<string>();
  const uniq = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  if (uniq.length === 0) return codes;

  for (const row of KOREA_SIGUNGU_COVERAGE) {
    if (uniq.some((term) => termMatchesSigungu(term, row))) {
      codes.add(row.code);
    }
  }
  return codes;
}

function findBrowseSubById(subId: string) {
  for (const main of MEDIA_BROWSE_REGIONS) {
    const sub = main.sub.find((s) => s.id === subId);
    if (sub) return { main, sub };
  }
  return null;
}

function addCodesFromBrowseSub(subId: string, into: Set<string>) {
  const found = findBrowseSubById(subId);
  if (found) {
    if (found.main.id === "national" || found.sub.id === "national") return;
    const terms = [
      found.sub.label,
      ...(found.sub.aliases ?? []),
      found.main.label,
    ];
    for (const code of sigunguCodesForSearchTerms(terms)) into.add(code);
    return;
  }
  for (const code of sigunguCodesForSearchTerms(
    expandBrowseRegionSub(subId),
  )) {
    into.add(code);
  }
}

/** 지역 필터 → 매칭 대상 시·군·구 코드 집합 */
export function resolveRegionFilterSigunguCodes(opts: {
  regionMain?: string;
  regionSub?: string;
  legacyRegion?: string;
}): RegionFilterSigunguCodes {
  const regionMain = opts.regionMain?.trim() ?? "";
  const regionSub = opts.regionSub?.trim() ?? "";
  const legacyRegion = opts.legacyRegion?.trim() ?? "";

  if (!regionMain && !regionSub && !legacyRegion) {
    return { kind: "none" };
  }

  if (
    regionMain === "national" ||
    regionSub === "national" ||
    legacyRegion === "전국" ||
    legacyRegion.toLowerCase() === "national"
  ) {
    return { kind: "all" };
  }

  const codes = new Set<string>();

  if (regionSub) {
    const canonical = resolveBrowseRegionSubId(regionSub) ?? regionSub;
    addCodesFromBrowseSub(canonical, codes);
  } else if (regionMain) {
    const main = getBrowseRegionMain(regionMain);
    if (main?.id === "national") return { kind: "all" };
    const sidos = BROWSE_MAIN_SIDO_NAMES[regionMain];
    if (sidos?.length) {
      for (const code of sigunguCodesForSidoNames(sidos)) codes.add(code);
    } else if (main) {
      for (const code of sigunguCodesForSearchTerms([main.label, main.id])) {
        codes.add(code);
      }
    }
  }

  if (legacyRegion) {
    for (const code of sigunguCodesForSearchTerms(
      expandMediaRegionChip(legacyRegion),
    )) {
      codes.add(code);
    }
  }

  return { kind: "codes", codes };
}

/** 이동형 — coverageDistrictCodes 와 지역 필터 교차 */
export function mediaMatchesCoverageRegion(
  media: Pick<MediaItem, "type" | "coverageDistrictCodes">,
  filter: RegionFilterSigunguCodes,
): boolean {
  if (filter.kind === "none") return false;
  if (media.type !== "mobile") return false;
  const itemCodes = media.coverageDistrictCodes;
  if (!itemCodes?.length) return false;
  if (filter.kind === "all") return true;
  if (filter.codes.size === 0) return false;
  return itemCodes.some((c) => filter.codes.has(c.trim()));
}

export function regionFilterIsActive(
  regionMain: string,
  regionSub: string,
  legacyRegion: string,
): boolean {
  return Boolean(
    regionMain.trim() || regionSub.trim() || legacyRegion.trim(),
  );
}
