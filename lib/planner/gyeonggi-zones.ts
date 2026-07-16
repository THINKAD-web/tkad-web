import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** matching-engine 경기 하위 상권 (플래너·추천 칩) */
export const PLANNER_GYEONGGI_ZONE_KEYS = [
  "seongnam",
  "suwon",
  "goyang",
  "bucheon",
  "gimpo",
  "hanam",
] as const;

export type PlannerGyeonggiZoneKey = (typeof PLANNER_GYEONGGI_ZONE_KEYS)[number];

export function isPlannerGyeonggiZoneKey(
  v: unknown,
): v is PlannerGyeonggiZoneKey {
  return (
    typeof v === "string" &&
    (PLANNER_GYEONGGI_ZONE_KEYS as readonly string[]).includes(v)
  );
}

type ZoneDef = { exact: RegExp; adjacent: RegExp };

const GYEONGGI_ZONE_DEFS: Record<PlannerGyeonggiZoneKey, ZoneDef> = {
  seongnam: {
    exact: /분당|판교|성남|정자|서현|야탑|수내|삼평|이매|백현|운중|판교역|서현역/i,
    adjacent: /수지|위례|중원|모란/i,
  },
  suwon: {
    exact: /수원|영통|팔달|장안|권선|수원역|매탄|영통역|화서/i,
    adjacent: /오산|용인|동탄/i,
  },
  goyang: {
    exact: /일산|고양|덕양|킨텍스|라페스타|정발산|백석|주엽|마두|일산동구|일산서구/i,
    adjacent: /파주|운정/i,
  },
  bucheon: {
    exact: /부천|소사|원미|오정|역곡|중동|송내|부천역/i,
    adjacent: /시흥|광명/i,
  },
  gimpo: {
    exact: /김포|고촌|양촌|구래|장기|김포대로|고촌역/i,
    adjacent: /강서|마곡/i,
  },
  hanam: {
    exact: /하남|미사|위례|신장동|미사대로|위례대로|하남시/i,
    adjacent: /성남|구리/i,
  },
};

export const PLANNER_GYEONGGI_ZONE_LABELS: Record<
  PlannerGyeonggiZoneKey,
  { labelKo: string; labelEn: string }
> = {
  seongnam: { labelKo: "분당·판교", labelEn: "Bundang / Pangyo" },
  suwon: { labelKo: "수원", labelEn: "Suwon" },
  goyang: { labelKo: "일산·고양", labelEn: "Ilsan / Goyang" },
  bucheon: { labelKo: "부천", labelEn: "Bucheon" },
  gimpo: { labelKo: "김포", labelEn: "Gimpo" },
  hanam: { labelKo: "하남·위례", labelEn: "Hanam / Wirye" },
};

/** browse `regionSub` → 플래너 경기 상권 */
export const BROWSE_SUB_TO_GYEONGGI_ZONE: Record<string, PlannerGyeonggiZoneKey> =
  {
    gyeonggi_seongnam: "seongnam",
    gyeonggi_suwon: "suwon",
    gyeonggi_goyang: "goyang",
    gyeonggi_bucheon: "bucheon",
    gyeonggi_gimpo: "gimpo",
    gyeonggi_hanam: "hanam",
  };

export const GYEONGGI_ZONE_REGEX: { zone: PlannerGyeonggiZoneKey; re: RegExp }[] =
  [
    { zone: "seongnam", re: GYEONGGI_ZONE_DEFS.seongnam.exact },
    { zone: "suwon", re: GYEONGGI_ZONE_DEFS.suwon.exact },
    { zone: "goyang", re: GYEONGGI_ZONE_DEFS.goyang.exact },
    { zone: "bucheon", re: GYEONGGI_ZONE_DEFS.bucheon.exact },
    { zone: "gimpo", re: GYEONGGI_ZONE_DEFS.gimpo.exact },
    { zone: "hanam", re: GYEONGGI_ZONE_DEFS.hanam.exact },
  ];

const GYEONGGI_NETWORK_RE =
  /경기도?\s*전역|광역버스|지선버스|g버스|서울·경기|경기\s*전역/i;

function plannerMediaHaystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.region,
    m.regionMain,
    m.regionSub,
    m.regionZone,
    m.subCategory,
    m.nearbyStations,
    m.nearbyLandmarks,
    m.nearbyFacilities,
    m.features,
    m.tags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isGyeonggiNetworkMedia(m: MediaItem): boolean {
  const hay = plannerMediaHaystack(m);
  if (GYEONGGI_NETWORK_RE.test(hay)) return true;
  const district = m.district?.trim() ?? "";
  return district.includes("전역");
}

/** 경기 매체가 선택 상권(복수 OR)에 맞는지. zones 비면 경기 전체 통과. */
export function mediaMatchesGyeonggiZones(
  m: MediaItem,
  zones: readonly PlannerGyeonggiZoneKey[],
): boolean {
  if (zones.length === 0) return true;
  const main = m.regionMain?.trim() ?? m.region?.trim();
  if (main && main !== "gyeonggi") return true;
  if (isGyeonggiNetworkMedia(m)) return true;
  const hay = plannerMediaHaystack(m);
  for (const z of zones) {
    const def = GYEONGGI_ZONE_DEFS[z];
    if (def.exact.test(hay) || def.adjacent.test(hay)) return true;
    if (m.regionSub && BROWSE_SUB_TO_GYEONGGI_ZONE[m.regionSub] === z) {
      return true;
    }
  }
  return false;
}

export function suggestGyeonggiZones(
  goal: PlannerCampaignGoal | null,
  _industryKey: PlannerIndustryKey,
): PlannerGyeonggiZoneKey[] {
  if (goal === "event") return ["seongnam", "suwon", "goyang"];
  if (goal === "local") return ["bucheon", "hanam", "gimpo"];
  if (goal === "sales") return ["seongnam", "suwon", "bucheon"];
  return ["seongnam", "suwon", "goyang"];
}

export function gyeonggiZonesToMatchingRegions(
  macroRegions: string[],
  zones: readonly PlannerGyeonggiZoneKey[],
): string[] {
  const out: string[] = [];
  const hasGyeonggi = macroRegions.includes("gyeonggi");
  for (const r of macroRegions) {
    if (r !== "gyeonggi") out.push(r);
  }
  if (hasGyeonggi) {
    if (zones.length > 0) {
      for (const z of zones) out.push(z);
    } else {
      out.push("gyeonggi");
    }
  }
  return out.length > 0 ? out : macroRegions;
}

export function formatGyeonggiZonesText(
  zones: readonly PlannerGyeonggiZoneKey[],
  isKo: boolean,
): string {
  if (zones.length === 0) {
    return isKo ? "경기 전체" : "All Gyeonggi";
  }
  return zones
    .map((z) =>
      isKo ?
        PLANNER_GYEONGGI_ZONE_LABELS[z].labelKo
      : PLANNER_GYEONGGI_ZONE_LABELS[z].labelEn,
    )
    .join(isKo ? " · " : ", ");
}

/** 서울·부산·경기·인천 상권을 matching-engine regions로 병합 */
export function mergePlannerMacroMatchingRegions(
  macroRegions: string[],
  seoulZones: readonly string[],
  busanZones: readonly string[],
  gyeonggiZones: readonly PlannerGyeonggiZoneKey[] = [],
  incheonZones: readonly string[] = [],
): string[] {
  const out: string[] = [];
  for (const r of macroRegions) {
    if (r === "seoul" || r === "busan" || r === "gyeonggi" || r === "incheon") {
      continue;
    }
    out.push(r);
  }
  if (macroRegions.includes("seoul")) {
    if (seoulZones.length > 0) {
      out.push(...seoulZones);
    } else {
      out.push("seoul");
    }
  }
  if (macroRegions.includes("busan")) {
    if (busanZones.length > 0) {
      out.push(...busanZones);
    } else {
      out.push("busan");
    }
  }
  if (macroRegions.includes("gyeonggi")) {
    if (gyeonggiZones.length > 0) {
      out.push(...gyeonggiZones);
    } else {
      out.push("gyeonggi");
    }
  }
  if (macroRegions.includes("incheon")) {
    if (incheonZones.length > 0) {
      out.push(...incheonZones);
    } else {
      out.push("incheon");
    }
  }
  return out.length > 0 ? out : macroRegions;
}
