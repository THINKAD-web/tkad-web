import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** matching-engine `REGION_DEFS` 부산 하위 상권 (플래너·추천 칩) */
export const PLANNER_BUSAN_ZONE_KEYS = [
  "centum",
  "haeundae",
  "seomyeon",
  "nampo",
  "downtown",
] as const;

export type PlannerBusanZoneKey = (typeof PLANNER_BUSAN_ZONE_KEYS)[number];

export function isPlannerBusanZoneKey(v: unknown): v is PlannerBusanZoneKey {
  return (
    typeof v === "string" &&
    (PLANNER_BUSAN_ZONE_KEYS as readonly string[]).includes(v)
  );
}

type ZoneDef = { exact: RegExp; adjacent: RegExp };

const BUSAN_ZONE_DEFS: Record<PlannerBusanZoneKey, ZoneDef> = {
  centum: {
    exact: /센텀|벡스코|bexco|centum|마린시티|센텀시티|시립미술/i,
    adjacent: /해운대|우동|동천/i,
  },
  haeundae: {
    exact: /해운대|동백|송정|마린|해수욕/i,
    adjacent: /센텀|반송|재송/i,
  },
  seomyeon: {
    exact: /서면|부전|전포|범천|양정/i,
    adjacent: /부산진|연산|망미/i,
  },
  nampo: {
    exact: /남포|광복|자갈치|보수동|중구/i,
    adjacent: /영도|동광|부산역/i,
  },
  downtown: {
    exact: /부산\s*시내|부산역|초량|참전|동구|서구/i,
    adjacent: /중구|영도|부암/i,
  },
};

export const PLANNER_BUSAN_ZONE_LABELS: Record<
  PlannerBusanZoneKey,
  { labelKo: string; labelEn: string }
> = {
  centum: { labelKo: "센텀·벡스코", labelEn: "Centum / BEXCO" },
  haeundae: { labelKo: "해운대", labelEn: "Haeundae" },
  seomyeon: { labelKo: "서면", labelEn: "Seomyeon" },
  nampo: { labelKo: "남포·광복", labelEn: "Nampo" },
  downtown: { labelKo: "부산 시내", labelEn: "Busan downtown" },
};

/** browse `regionSub` → 플래너 부산 상권 */
export const BROWSE_SUB_TO_BUSAN_ZONE: Record<string, PlannerBusanZoneKey> = {
  busan_haeundae: "haeundae",
  busan_seomyeon: "seomyeon",
  busan_nampo: "nampo",
  busan_downtown: "downtown",
};

export const BUSAN_ZONE_REGEX: { zone: PlannerBusanZoneKey; re: RegExp }[] = [
  { zone: "centum", re: BUSAN_ZONE_DEFS.centum.exact },
  { zone: "haeundae", re: BUSAN_ZONE_DEFS.haeundae.exact },
  { zone: "seomyeon", re: BUSAN_ZONE_DEFS.seomyeon.exact },
  { zone: "nampo", re: BUSAN_ZONE_DEFS.nampo.exact },
  { zone: "downtown", re: BUSAN_ZONE_DEFS.downtown.exact },
];

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

/** 부산 매체가 선택 상권(복수 OR)에 맞는지. zones 비면 부산 전체 통과. */
export function mediaMatchesBusanZones(
  m: MediaItem,
  zones: readonly PlannerBusanZoneKey[],
): boolean {
  if (zones.length === 0) return true;
  const main = m.regionMain?.trim() ?? m.region?.trim();
  if (main && main !== "busan") return true;
  const hay = plannerMediaHaystack(m);
  for (const z of zones) {
    const def = BUSAN_ZONE_DEFS[z];
    if (def.exact.test(hay) || def.adjacent.test(hay)) return true;
    if (m.regionSub && BROWSE_SUB_TO_BUSAN_ZONE[m.regionSub] === z) {
      return true;
    }
  }
  return false;
}

export function suggestBusanZones(
  goal: PlannerCampaignGoal | null,
  _industryKey: PlannerIndustryKey,
): PlannerBusanZoneKey[] {
  if (goal === "event") return ["centum", "haeundae", "seomyeon"];
  if (goal === "local") return ["seomyeon", "nampo"];
  if (goal === "sales") return ["seomyeon", "centum"];
  return ["centum", "haeundae", "seomyeon"];
}

export { mergePlannerMacroMatchingRegions } from "@/lib/planner/gyeonggi-zones";

/** 매칭 엔진 regions 배열 — macro + 부산 상권 코드 */
export function busanZonesToMatchingRegions(
  macroRegions: string[],
  zones: readonly PlannerBusanZoneKey[],
): string[] {
  const out: string[] = [];
  const hasBusan = macroRegions.includes("busan");
  for (const r of macroRegions) {
    if (r !== "busan") out.push(r);
  }
  if (hasBusan) {
    if (zones.length > 0) {
      for (const z of zones) out.push(z);
    } else {
      out.push("busan");
    }
  }
  return out.length > 0 ? out : macroRegions;
}

export function formatBusanZonesText(
  zones: readonly PlannerBusanZoneKey[],
  isKo: boolean,
): string {
  if (zones.length === 0) {
    return isKo ? "부산 전체" : "All Busan";
  }
  return zones
    .map((z) =>
      isKo ? PLANNER_BUSAN_ZONE_LABELS[z].labelKo : PLANNER_BUSAN_ZONE_LABELS[z].labelEn,
    )
    .join(isKo ? " · " : ", ");
}
