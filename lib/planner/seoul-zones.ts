import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** matching-engine `REGION_DEFS` 서울 하위 상권 (플래너 칩) */
export const PLANNER_SEOUL_ZONE_KEYS = [
  "gangnam",
  "hongdae",
  "seongsu",
  "myeongdong",
  "yeouido",
  "guro",
  "jamsil",
  "gangbuk",
  "gangseo",
] as const;

export type PlannerSeoulZoneKey = (typeof PLANNER_SEOUL_ZONE_KEYS)[number];

export function isPlannerSeoulZoneKey(v: unknown): v is PlannerSeoulZoneKey {
  return (
    typeof v === "string" &&
    (PLANNER_SEOUL_ZONE_KEYS as readonly string[]).includes(v)
  );
}

type ZoneDef = { exact: RegExp; adjacent: RegExp };

const SEOUL_ZONE_DEFS: Record<PlannerSeoulZoneKey, ZoneDef> = {
  gangnam: {
    exact: /강남|서초|역삼|삼성|청담|논현|테헤란|coex|선릉|신논현/i,
    adjacent: /양재|대치|도곡|개포|관악|동작|사당|신림|봉천/i,
  },
  hongdae: {
    exact: /홍대|마포|합정|상수|연남|신촌|서강|망원|공덕/i,
    adjacent: /용산|이태원|서대문|은평/i,
  },
  seongsu: {
    exact: /성수|뚝섬|건대|왕십리|성동|연무장/i,
    adjacent: /송정|군자|광진|동대문/i,
  },
  myeongdong: {
    exact: /명동|중구|을지로|충무로|동대문|시청|남대문/i,
    adjacent: /종로|광화문|필동|회현/i,
  },
  yeouido: {
    exact: /여의도|영등포|당산|문래|국회|ifc/i,
    adjacent: /마포|용산/i,
  },
  guro: {
    exact: /구로|금천|가산|신도림|디지털단지|구로역|가산디지털|독산/i,
    adjacent: /영등포|문래/i,
  },
  jamsil: {
    exact: /잠실|송파|강동|천호|성내동|문정|가락|롯데월드|잠실역|천호역/i,
    adjacent: /광진|군자/i,
  },
  gangbuk: {
    exact: /노원|도봉|중랑|상봉|상계|중계|쌍문|방학|노원역|상봉역/i,
    adjacent: /강북|성북|미아|정릉/i,
  },
  gangseo: {
    exact: /강서|양천|목동|오목교|화곡|까치산|발산|마곡|목동역/i,
    adjacent: /영등포|구로/i,
  },
};

export const PLANNER_SEOUL_ZONE_LABELS: Record<
  PlannerSeoulZoneKey,
  { labelKo: string; labelEn: string }
> = {
  gangnam: { labelKo: "강남", labelEn: "Gangnam" },
  hongdae: { labelKo: "홍대", labelEn: "Hongdae" },
  seongsu: { labelKo: "성수", labelEn: "Seongsu" },
  myeongdong: { labelKo: "명동", labelEn: "Myeongdong" },
  yeouido: { labelKo: "여의도", labelEn: "Yeouido" },
  guro: { labelKo: "구로·가산", labelEn: "Guro / Gasan" },
  jamsil: { labelKo: "잠실·송파", labelEn: "Jamsil / Songpa" },
  gangbuk: { labelKo: "노원·동북", labelEn: "Nowon / Northeast" },
  gangseo: { labelKo: "강서·목동", labelEn: "Gangseo / Mokdong" },
};

/** browse `regionSub` → 플래너 서울 상권 */
export const BROWSE_SUB_TO_SEOUL_ZONE: Record<string, PlannerSeoulZoneKey> = {
  seoul_gangnam: "gangnam",
  seoul_coex: "gangnam",
  seoul_hongdae: "hongdae",
  seoul_sinchon: "hongdae",
  seoul_seongsu: "seongsu",
  seoul_cbd: "myeongdong",
  seoul_jongno: "myeongdong",
  seoul_itaewon: "myeongdong",
  seoul_dongdaemun: "myeongdong",
  seoul_yeongdeungpo: "yeouido",
  seoul_jamsil: "jamsil",
  seoul_guro: "guro",
  seoul_gangbuk: "gangbuk",
  seoul_nowon: "gangbuk",
};

/** 자유입력·브리프 파싱용 역·일대 별칭 */
export const SEOUL_ZONE_REGEX: { zone: PlannerSeoulZoneKey; re: RegExp }[] = [
  {
    zone: "gangnam",
    re: /강남(?:역|권|구)?(?:\s*(?:근처|일대|주변))?|강남권|서초|역삼|삼성|코엑스|테헤란|선릉|삼성역|사당|신림|관악/i,
  },
  {
    zone: "hongdae",
    re: /홍대(?:입구|앞|역)?(?:\s*(?:근처|일대|주변))?|홍대\s*일대|마포|합정|연남|신촌/i,
  },
  {
    zone: "seongsu",
    re: /성수(?:동|역)?(?:\s*(?:근처|일대|주변))?|성수\s*일대|뚝섬|건대|왕십리/i,
  },
  {
    zone: "myeongdong",
    re: /명동(?:역)?(?:\s*(?:근처|일대|주변))?/i,
  },
  {
    zone: "myeongdong",
    re: /을지로(?:\s*(?:근처|일대|주변))?/i,
  },
  {
    zone: "myeongdong",
    re: /광화문|종로(?:\s*(?:근처|일대|주변))?|동대문|시청/i,
  },
  {
    zone: "yeouido",
    re: /여의도(?:역)?(?:\s*(?:근처|일대|주변))?|영등포|당산/i,
  },
  {
    zone: "guro",
    re: /구로(?:역|구)?|금천|가산|신도림|디지털단지/i,
  },
  {
    zone: "jamsil",
    re: /잠실|송파|강동|천호|롯데월드/i,
  },
  {
    zone: "gangbuk",
    re: /노원|도봉|중랑|상봉|상계/i,
  },
  {
    zone: "gangseo",
    re: /강서|양천|목동|오목교/i,
  },
];

/** regionMain=seoul 이지만 실제 위치가 타 광역인 오분류 매체 */
const NON_SEOUL_LOCATION_RE =
  /인천(?:광역시|\s)|부평구|검암(?:역|로)|광명시|경기\s*광명/i;

const SEOUL_CITYWIDE_RE = /서울\s*전역|서울,\s*수도권/i;

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

function isMisclassifiedNonSeoulMedia(m: MediaItem): boolean {
  const primaryLoc = m.location?.trim() ?? "";
  if (primaryLoc && NON_SEOUL_LOCATION_RE.test(primaryLoc)) return true;
  const district = m.district?.trim() ?? "";
  if (
    district &&
    NON_SEOUL_LOCATION_RE.test(district) &&
    !/^서울/.test(primaryLoc)
  ) {
    return true;
  }
  return false;
}

function isSeoulCitywideMedia(m: MediaItem): boolean {
  const hay = plannerMediaHaystack(m);
  if (SEOUL_CITYWIDE_RE.test(hay)) return true;
  const district = m.district?.trim() ?? "";
  return district.includes("서울 전역");
}

/** 서울 매체가 선택 상권(복수 OR)에 맞는지. zones 비면 서울 전체 통과. */
export function mediaMatchesSeoulZones(
  m: MediaItem,
  zones: readonly PlannerSeoulZoneKey[],
): boolean {
  if (zones.length === 0) return true;

  const main = m.regionMain?.trim() ?? m.region?.trim();
  if (main && main !== "seoul") return true;

  if (isMisclassifiedNonSeoulMedia(m)) return false;
  if (isSeoulCitywideMedia(m)) return false;

  const hay = plannerMediaHaystack(m);
  const exactZone = PLANNER_SEOUL_ZONE_KEYS.find((z) =>
    SEOUL_ZONE_DEFS[z].exact.test(hay),
  );

  for (const z of zones) {
    const def = SEOUL_ZONE_DEFS[z];
    if (def.exact.test(hay) || def.adjacent.test(hay)) return true;
    if (
      !exactZone &&
      m.regionSub &&
      BROWSE_SUB_TO_SEOUL_ZONE[m.regionSub] === z
    ) {
      return true;
    }
  }
  return false;
}

/** 목표·업종 기반 추천 상권 (규칙). 사용자가 수동 조정 가능. */
export function suggestSeoulZones(
  goal: PlannerCampaignGoal | null,
  industryKey: PlannerIndustryKey,
): PlannerSeoulZoneKey[] {
  if (goal === "local") return ["hongdae", "myeongdong"];
  if (goal === "event") return ["hongdae", "gangnam"];
  if (goal === "sales") return ["gangnam", "myeongdong"];

  switch (industryKey) {
    case "indFb":
      return ["hongdae", "myeongdong", "seongsu"];
    case "indRetail":
      return ["gangnam", "seongsu"];
    case "indTech":
    case "indFinance":
      return ["gangnam", "yeouido"];
    case "indEnt":
      return ["hongdae", "gangnam"];
    default:
      if (goal === "launch") return ["gangnam", "seongsu"];
      return ["gangnam", "hongdae"];
  }
}

/** 매칭 엔진 regions 배열 — macro + 상권 코드 */
export function seoulZonesToMatchingRegions(
  macroRegions: string[],
  zones: readonly PlannerSeoulZoneKey[],
): string[] {
  const out: string[] = [];
  const hasSeoul = macroRegions.includes("seoul");
  for (const r of macroRegions) {
    if (r !== "seoul") out.push(r);
  }
  if (hasSeoul) {
    if (zones.length > 0) {
      for (const z of zones) out.push(z);
    } else {
      out.push("seoul");
    }
  }
  return out.length > 0 ? out : macroRegions;
}

export function formatSeoulZonesText(
  zones: readonly PlannerSeoulZoneKey[],
  isKo: boolean,
): string {
  if (zones.length === 0) {
    return isKo ? "서울 전체" : "All Seoul";
  }
  return zones
    .map((z) =>
      isKo ? PLANNER_SEOUL_ZONE_LABELS[z].labelKo : PLANNER_SEOUL_ZONE_LABELS[z].labelEn,
    )
    .join(isKo ? " · " : ", ");
}
