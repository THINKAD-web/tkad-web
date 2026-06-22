import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** matching-engine `REGION_DEFS` 서울 하위 5상권 (플래너 칩) */
export const PLANNER_SEOUL_ZONE_KEYS = [
  "gangnam",
  "hongdae",
  "seongsu",
  "myeongdong",
  "yeouido",
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
    adjacent: /송파|잠실|양재|대치|도곡|개포/i,
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
    adjacent: /마포|용산|강서/i,
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
};

function plannerMediaHaystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.region,
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

/** 서울 매체가 선택 상권(복수 OR)에 맞는지. zones 비면 서울 전체 통과. */
export function mediaMatchesSeoulZones(
  m: MediaItem,
  zones: readonly PlannerSeoulZoneKey[],
): boolean {
  if (zones.length === 0) return true;
  if (m.region !== "seoul") return true;
  const hay = plannerMediaHaystack(m);
  for (const z of zones) {
    const def = SEOUL_ZONE_DEFS[z];
    if (def.exact.test(hay) || def.adjacent.test(hay)) return true;
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
