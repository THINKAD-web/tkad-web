import { BUSAN_ZONE_REGEX } from "@/lib/planner/busan-zones";
import { GYEONGGI_ZONE_REGEX } from "@/lib/planner/gyeonggi-zones";
import { INCHEON_ZONE_REGEX } from "@/lib/planner/incheon-zones";
import {
  SEOUL_ZONE_REGEX,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";

type ZoneScanRule = {
  zone: string;
  re: RegExp;
  macro: "seoul" | "busan" | "gyeonggi" | "incheon";
};

const ZONE_SCAN_RULES: readonly ZoneScanRule[] = [
  ...SEOUL_ZONE_REGEX.map(({ zone, re }) => ({
    zone,
    re,
    macro: "seoul" as const,
  })),
  ...BUSAN_ZONE_REGEX.map(({ zone, re }) => ({
    zone,
    re,
    macro: "busan" as const,
  })),
  ...GYEONGGI_ZONE_REGEX.map(({ zone, re }) => ({
    zone,
    re,
    macro: "gyeonggi" as const,
  })),
  ...INCHEON_ZONE_REGEX.map(({ zone, re }) => ({
    zone,
    re,
    macro: "incheon" as const,
  })),
];

/** seoulZones SSOT 보강 — 별도 역명 DB 없이 행정구역만 연결 */
const SEOUL_DISTRICT_ZONE: readonly {
  re: RegExp;
  zone: PlannerSeoulZoneKey;
}[] = [
  { re: /성동구/u, zone: "seongsu" },
  { re: /강남구/u, zone: "gangnam" },
  { re: /송파구/u, zone: "jamsil" },
  { re: /마포구/u, zone: "hongdae" },
  { re: /영등포구/u, zone: "yeouido" },
  { re: /구로구|금천구/u, zone: "guro" },
  { re: /강서구|양천구/u, zone: "gangseo" },
  { re: /노원구|도봉구|중랑구/u, zone: "gangbuk" },
  { re: /중구/u, zone: "myeongdong" },
];

function collapseToken(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * zone 테이블(seoulZones 등)에서 지역 키워드 추출.
 * - 매칭 literal(강남역·잠실역 등) + zone code(gangnam) + macro(seoul)
 * - 매체 intent 추측 없음
 */
export function extractLocationKeywordsFromZones(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  const push = (kw: string) => {
    const k = collapseToken(kw);
    if (k.length < 2) return;
    const key = k.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(k);
  };

  for (const { re } of ZONE_SCAN_RULES) {
    const m = t.match(re);
    if (m?.[0]) {
      push(m[0]);
    }
  }

  for (const { re } of SEOUL_DISTRICT_ZONE) {
    if (re.test(t)) {
      const m = t.match(re);
      if (m?.[0]) push(m[0]);
    }
  }

  for (const st of t.match(/[가-힣]{2,10}역/g) ?? []) {
    push(st);
  }

  return out;
}
