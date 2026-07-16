import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** matching-engine 인천 하위 상권 (플래너·추천 칩) */
export const PLANNER_INCHEON_ZONE_KEYS = [
  "airport",
  "songdo",
  "downtown",
] as const;

export type PlannerIncheonZoneKey = (typeof PLANNER_INCHEON_ZONE_KEYS)[number];

export function isPlannerIncheonZoneKey(
  v: unknown,
): v is PlannerIncheonZoneKey {
  return (
    typeof v === "string" &&
    (PLANNER_INCHEON_ZONE_KEYS as readonly string[]).includes(v)
  );
}

type ZoneDef = { exact: RegExp; adjacent: RegExp };

const INCHEON_ZONE_DEFS: Record<PlannerIncheonZoneKey, ZoneDef> = {
  airport: {
    exact:
      /인천국제공항|인천공항|제[12]터미널|공항철도|키로뷰\s*인천|영종|운서|공항로/i,
    adjacent: /중구.*공항|검암역|계양역/i,
  },
  songdo: {
    exact: /송도|트리플|컨벤시아|파라다이스시티|연수구/i,
    adjacent: /연수|인천대|테크노파크/i,
  },
  downtown: {
    exact: /부평|주안|구월|연수동|미추홀|계양|검단|서구|인천역|차이나타운/i,
    adjacent: /남동|동구|중구(?!.*공항)/i,
  },
};

export const PLANNER_INCHEON_ZONE_LABELS: Record<
  PlannerIncheonZoneKey,
  { labelKo: string; labelEn: string }
> = {
  airport: { labelKo: "인천공항", labelEn: "Incheon Airport" },
  songdo: { labelKo: "송도", labelEn: "Songdo" },
  downtown: { labelKo: "인천 시내", labelEn: "Incheon downtown" },
};

/** browse `regionSub` → 플래너 인천 상권 */
export const BROWSE_SUB_TO_INCHEON_ZONE: Record<string, PlannerIncheonZoneKey> =
  {
    incheon_airport: "airport",
    incheon_songdo: "songdo",
    incheon_downtown: "downtown",
  };

export const INCHEON_ZONE_REGEX: { zone: PlannerIncheonZoneKey; re: RegExp }[] =
  [
    { zone: "airport", re: INCHEON_ZONE_DEFS.airport.exact },
    { zone: "songdo", re: INCHEON_ZONE_DEFS.songdo.exact },
    { zone: "downtown", re: INCHEON_ZONE_DEFS.downtown.exact },
  ];

/** 도심공항 리무진·에어부산 기내 등 — zone 필터 시 pass-through */
const INCHEON_NETWORK_RE =
  /도심공항|리무진|에어부산|기내|항공기\s*외부|탑승권/i;

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

function isIncheonNetworkMedia(m: MediaItem): boolean {
  const hay = plannerMediaHaystack(m);
  if (INCHEON_NETWORK_RE.test(hay)) return true;
  const district = m.district?.trim() ?? "";
  return district.includes("전역");
}

/** 인천 매체가 선택 상권(복수 OR)에 맞는지. zones 비면 인천 전체 통과. */
export function mediaMatchesIncheonZones(
  m: MediaItem,
  zones: readonly PlannerIncheonZoneKey[],
): boolean {
  if (zones.length === 0) return true;
  const main = m.regionMain?.trim() ?? m.region?.trim();
  if (main && main !== "incheon") return true;
  if (isIncheonNetworkMedia(m)) return true;
  const hay = plannerMediaHaystack(m);
  for (const z of zones) {
    const def = INCHEON_ZONE_DEFS[z];
    if (def.exact.test(hay) || def.adjacent.test(hay)) return true;
    if (m.regionSub && BROWSE_SUB_TO_INCHEON_ZONE[m.regionSub] === z) {
      return true;
    }
  }
  return false;
}

export function suggestIncheonZones(
  goal: PlannerCampaignGoal | null,
  _industryKey: PlannerIndustryKey,
): PlannerIncheonZoneKey[] {
  if (goal === "event") return ["airport", "songdo"];
  if (goal === "local") return ["downtown", "songdo"];
  if (goal === "sales") return ["airport", "downtown"];
  return ["airport", "songdo"];
}

export function incheonZonesToMatchingRegions(
  macroRegions: string[],
  zones: readonly PlannerIncheonZoneKey[],
): string[] {
  const out: string[] = [];
  const hasIncheon = macroRegions.includes("incheon");
  for (const r of macroRegions) {
    if (r !== "incheon") out.push(r);
  }
  if (hasIncheon) {
    if (zones.length > 0) {
      for (const z of zones) out.push(z);
    } else {
      out.push("incheon");
    }
  }
  return out.length > 0 ? out : macroRegions;
}

export function formatIncheonZonesText(
  zones: readonly PlannerIncheonZoneKey[],
  isKo: boolean,
): string {
  if (zones.length === 0) {
    return isKo ? "인천 전체" : "All Incheon";
  }
  return zones
    .map((z) =>
      isKo
        ? PLANNER_INCHEON_ZONE_LABELS[z].labelKo
        : PLANNER_INCHEON_ZONE_LABELS[z].labelEn,
    )
    .join(isKo ? " · " : ", ");
}
