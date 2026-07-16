import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { listMediaHotspotRegions } from "@/lib/media-hotspot-regions";
import { PLANNER_INDUSTRY_HINTS } from "@/lib/planner/industry-match";
import {
  parseTargetAge,
  type ParsedTargetAge,
} from "@/lib/planner/parse-target-age";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import {
  BROWSE_SUB_TO_BUSAN_ZONE,
  BUSAN_ZONE_REGEX,
  type PlannerBusanZoneKey,
} from "@/lib/planner/busan-zones";
import {
  BROWSE_SUB_TO_GYEONGGI_ZONE,
  GYEONGGI_ZONE_REGEX,
  type PlannerGyeonggiZoneKey,
} from "@/lib/planner/gyeonggi-zones";
import {
  BROWSE_SUB_TO_INCHEON_ZONE,
  INCHEON_ZONE_REGEX,
  type PlannerIncheonZoneKey,
} from "@/lib/planner/incheon-zones";
import { parseDurationFields } from "@/lib/planner/parse-duration";
import {
  BROWSE_SUB_TO_SEOUL_ZONE,
  isPlannerSeoulZoneKey,
  PLANNER_SEOUL_ZONE_KEYS,
  SEOUL_ZONE_REGEX,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import {
  PLANNER_DEFAULT_CATEGORIES,
  PLANNER_BUDGET_MIN,
  type PlannerAgeKey,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerIndustryKey,
} from "@/lib/planner/types";

export type ParseConfidence = "high" | "low";

export type ParsedField<T> = {
  value: T | null;
  confidence: ParseConfidence;
  /** 매칭된 원문 조각 (UI 디버그·칩용) */
  source: string | null;
};

export type PlannerFreetextParseResult = {
  raw: string;
  fields: {
    campaignGoal: ParsedField<PlannerCampaignGoal>;
    regions: ParsedField<string[]>;
    seoulZones: ParsedField<PlannerSeoulZoneKey[]>;
    ageKeys: ParsedField<PlannerAgeKey[]>;
    industryKey: ParsedField<PlannerIndustryKey>;
    budgetMan: ParsedField<number>;
    months: ParsedField<number>;
    durationDays: ParsedField<number>;
    busanZones: ParsedField<PlannerBusanZoneKey[]>;
    gyeonggiZones: ParsedField<PlannerGyeonggiZoneKey[]>;
    incheonZones: ParsedField<PlannerIncheonZoneKey[]>;
    categories: ParsedField<PlannerCategory[]>;
  };
  /** 인식되지 않은 잔여 토큰·구문 */
  unmatchedTokens: string[];
};

/** 우선순위: 앞쪽 goal 이 먼저 매칭 (더 구체적 표현 우선) */
const GOAL_PATTERNS: {
  goal: PlannerCampaignGoal;
  patterns: RegExp[];
}[] = [
  {
    goal: "local",
    patterns: [
      /동네|상권|로컬|지역\s*밀착|근처\s*주민|주변\s*주민|근처\s*상권/i,
    ],
  },
  {
    goal: "sales",
    patterns: [
      /전환|매출|구매\s*유도|판매\s*촉진|판매|구매|세일|sale(?!\s*페이지)/i,
      /conversion/i,
    ],
  },
  {
    goal: "event",
    patterns: [
      /프로모션|프로모|이벤트|팝업\s*스토어|팝업스토어|팝업|행사|할인|promotion/i,
    ],
  },
  {
    goal: "launch",
    patterns: [
      /런칭|론칭|출시|신제품|신규\s*오픈|그랜드\s*오픈|신규|launch/i,
      /새로\s*(?:오픈|출시|런칭|론칭)/i,
      /오픈/i,
    ],
  },
  {
    goal: "brand",
    patterns: [
      /브랜딩|브랜드\s*인지|브랜드\s*알리기|브랜드\s*각인|브랜드\s*노출/i,
      /인지도|인지\s*확대|노출\s*확대|awareness/i,
      /알리고\s*싶|브랜드/i,
    ],
  },
];

/** PLANNER_INDUSTRY_HINTS 외 한국어 자주 쓰는 업종 표현 */
const SUPPLEMENTAL_INDUSTRY: {
  key: Exclude<PlannerIndustryKey, "indOther">;
  patterns: RegExp[];
}[] = [
  {
    key: "indRetail",
    patterns: [
      /뷰티|beauty|화장품|코스메틱|cosmetic|스킨케어|메이크업|패션|fashion|의류/i,
    ],
  },
  { key: "indFb", patterns: [/f\s*&\s*b|fnb|식음료|외식|맛집|음식점/i] },
  {
    key: "indTech",
    patterns: [/아이티|it\s*업|ict|스타트업|테크|saas|앱\s*서비스/i],
  },
  {
    key: "indFinance",
    patterns: [/핀테크|fintech|증권|보험사|은행|카드사/i],
  },
  { key: "indEnt", patterns: [/k\s*pop|kpop|아이돌|콘서트|공연|영화/i] },
];

const MACRO_REGION_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "national", re: /전국|수도권\s*전체|nationwide/i },
  { id: "busan", re: /부산|해운대|서면|센텀/i },
  { id: "jeju", re: /제주|서귀포|애월/i },
  { id: "daegu", re: /대구/i },
  { id: "incheon", re: /인천|송도|인천공항|영종/i },
  { id: "gyeonggi", re: /경기|판교|분당|수원|성남|일산|동탄|안양|용인|화성|광명/i },
  { id: "seoul", re: /서울|수도권/i },
];

/** 자유입력 전용 타깃 보조 패턴 (명시 세대·연령대 표현) */
const AGE_SUPPLEMENTAL: { keys: PlannerAgeKey[]; re: RegExp; label: string }[] =
  [
    {
      keys: ["age20s", "age30s"],
      re: /mz\s*세대|2030\s*세대|z\s*세대|밀레니얼|millennial|이\s*삼\s*십\s*대|이삼십대|젊은\s*층/i,
      label: "2030/MZ",
    },
    {
      keys: ["age40s"],
      re: /중년|40\s*대|사십\s*대/i,
      label: "40대/중년",
    },
    {
      keys: ["age50plus"],
      re: /시니어|실버|50\s*대|오십\s*대|60\s*대|육십\s*대/i,
      label: "50대+/시니어",
    },
  ];

const KO_DIGIT: Record<string, number> = {
  영: 0,
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
  한: 1,
  두: 2,
  세: 3,
  네: 4,
  스무: 2,
  서른: 3,
  마흔: 4,
  쉰: 5,
};

function emptyField<T>(): ParsedField<T> {
  return { value: null, confidence: "low", source: null };
}

function field<T>(
  value: T,
  confidence: ParseConfidence,
  source: string,
): ParsedField<T> {
  return { value, confidence, source };
}

function normalizeInput(raw: string): string {
  return raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48))
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCampaignGoal(text: string): ParsedField<PlannerCampaignGoal> {
  for (const { goal, patterns } of GOAL_PATTERNS) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m?.[0]) {
        return field(goal, "high", m[0]);
      }
    }
  }
  return emptyField();
}

/** 한글 숫자 구문 → 만원 단위 (삼천만, 오백만 등) */
function parseKoreanManPhrase(text: string): ParsedField<number> {
  const m = text.match(
    /([일이삼사오육칠팔구한두세네스무서른마흔쉰]+)\s*(천|백)\s*만(?:\s*원)?/i,
  );
  if (!m?.[1] || !m[2]) return emptyField();

  let n = 0;
  const chunk = m[1];
  if (chunk.length === 1 && KO_DIGIT[chunk] != null) {
    n = KO_DIGIT[chunk]!;
  } else if (KO_DIGIT[chunk] != null) {
    n = KO_DIGIT[chunk]!;
  } else {
    return emptyField();
  }

  const unit = m[2];
  const man = unit === "천" ? n * 1000 : n * 100;
  if (man <= 0) return emptyField();
  return field(Math.min(1_000_000, man), "high", m[0]);
}

function parseBudgetMan(text: string): ParsedField<number> {
  const ko = parseKoreanManPhrase(text);
  if (ko.value != null) return ko;

  const patterns: { re: RegExp; scale: (n: number) => number }[] = [
    {
      re: /(?:약|대략|최대)?\s*(\d+(?:\.\d+)?)\s*억\s*(?:원)?(?:\s*정도)?/i,
      scale: (n) => Math.round(n * 10_000),
    },
    {
      re: /(?:약|대략)?\s*(\d+(?:\.\d+)?)\s*천\s*만\s*(?:원)?(?:\s*정도)?/i,
      scale: (n) => Math.round(n * 1_000),
    },
    {
      re: /(?:약|대략)?\s*(\d+(?:\.\d+)?)\s*천(?!\s*만)\s*(?:원)?(?:\s*정도)?/i,
      scale: (n) => Math.round(n * 1_000),
    },
    {
      re: /월\s*(?:약\s*)?(\d+(?:\.\d+)?)\s*만\s*(?:원)?(?:\s*정도)?/i,
      scale: (n) => Math.round(n),
    },
    {
      re: /(?:약|대략)?\s*(\d+(?:\.\d+)?)\s*만\s*(?:원)?(?:\s*정도)?/i,
      scale: (n) => Math.round(n),
    },
  ];

  for (const { re, scale } of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) {
        const man = Math.min(1_000_000, scale(n));
        return field(man, "high", m[0].trim());
      }
    }
  }
  return emptyField();
}

function parseMonths(text: string): ParsedField<number> {
  return parseDurationFields(text).months;
}

function parseDurationDays(text: string): ParsedField<number> {
  return parseDurationFields(text).durationDays;
}

function parsedAgeToPlannerAgeKeys(
  parsed: ParsedTargetAge,
): PlannerAgeKey[] | null {
  if (parsed.kind === "all") {
    if (parsed.source === "explicit") return ["ageAll"];
    return null;
  }
  const keys = new Set<PlannerAgeKey>();
  for (let d = parsed.minDecade; d <= parsed.maxDecade; d += 10) {
    if (d <= 20) keys.add("age20s");
    else if (d <= 30) keys.add("age30s");
    else if (d <= 40) keys.add("age40s");
    else keys.add("age50plus");
  }
  return keys.size > 0 ? [...keys] : null;
}

function parseAgeKeysSupplemental(
  text: string,
): ParsedField<PlannerAgeKey[]> | null {
  for (const { keys, re, label } of AGE_SUPPLEMENTAL) {
    const m = text.match(re);
    if (m?.[0]) {
      return field(keys, "high", m[0] || label);
    }
  }
  return null;
}

function parseAgeKeys(text: string): ParsedField<PlannerAgeKey[]> {
  const supplemental = parseAgeKeysSupplemental(text);
  if (supplemental) return supplemental;

  const parsed = parseTargetAge(text);
  const keys = parsedAgeToPlannerAgeKeys(parsed);
  if (!keys) return emptyField();

  const source =
    parsed.kind === "range"
      ? `${parsed.minDecade}${parsed.minDecade !== parsed.maxDecade ? `~${parsed.maxDecade}` : ""}`
      : "전연령";
  const confidence: ParseConfidence =
    parsed.source === "fallback" ? "low" : "high";
  return field(keys, confidence, source);
}

type RegionHit = {
  mainId: string;
  subId?: string;
  source: string;
  confidence: ParseConfidence;
};

function scanBrowseRegions(text: string): RegionHit[] {
  const hits: RegionHit[] = [];
  for (const main of MEDIA_BROWSE_REGIONS) {
    if (
      text.includes(main.label) ||
      (main.labelEn && new RegExp(main.labelEn, "i").test(text))
    ) {
      hits.push({
        mainId: main.id,
        source: main.label,
        confidence: "high",
      });
    }
    for (const sub of main.sub) {
      const labels = [sub.label, ...(sub.aliases ?? [])];
      for (const label of labels) {
        if (label.length >= 2 && text.includes(label)) {
          hits.push({
            mainId: main.id,
            subId: sub.id,
            source: label,
            confidence: "high",
          });
        }
      }
    }
  }
  return hits;
}

function scanHotspots(text: string): RegionHit[] {
  const hits: RegionHit[] = [];
  for (const h of listMediaHotspotRegions()) {
    if (text.includes(h.labelKo)) {
      hits.push({
        mainId: h.regionMain,
        subId: h.regionSub,
        source: h.labelKo,
        confidence: "high",
      });
    }
    if (h.labelEn && new RegExp(h.labelEn, "i").test(text)) {
      hits.push({
        mainId: h.regionMain,
        subId: h.regionSub,
        source: h.labelEn,
        confidence: "high",
      });
    }
  }
  return hits;
}

function scanMacroRegions(text: string): RegionHit[] {
  const hits: RegionHit[] = [];
  for (const { id, re } of MACRO_REGION_PATTERNS) {
    const m = text.match(re);
    if (m?.[0]) {
      hits.push({ mainId: id, source: m[0], confidence: "high" });
    }
  }
  return hits;
}

function scanSeoulZones(text: string): {
  zones: PlannerSeoulZoneKey[];
  source: string | null;
  confidence: ParseConfidence;
} {
  const found = new Set<PlannerSeoulZoneKey>();
  let source: string | null = null;
  for (const { zone, re } of SEOUL_ZONE_REGEX) {
    const m = text.match(re);
    if (m?.[0]) {
      found.add(zone);
      source = source ? `${source}, ${m[0]}` : m[0];
    }
  }
  for (const z of PLANNER_SEOUL_ZONE_KEYS) {
    if (isPlannerSeoulZoneKey(z) && new RegExp(z, "i").test(text)) {
      found.add(z);
    }
  }
  if (found.size === 0) {
    return { zones: [], source: null, confidence: "low" };
  }
  return {
    zones: [...found],
    source,
    confidence: "high",
  };
}

function scanBusanZones(text: string): {
  zones: PlannerBusanZoneKey[];
  source: string | null;
  confidence: ParseConfidence;
} {
  const found = new Set<PlannerBusanZoneKey>();
  let source: string | null = null;
  for (const { zone, re } of BUSAN_ZONE_REGEX) {
    const m = text.match(re);
    if (m?.[0]) {
      found.add(zone);
      source = source ? `${source}, ${m[0]}` : m[0];
    }
  }
  if (found.size === 0) {
    return { zones: [], source: null, confidence: "low" };
  }
  return {
    zones: [...found],
    source,
    confidence: "high",
  };
}

function scanGyeonggiZones(text: string): {
  zones: PlannerGyeonggiZoneKey[];
  source: string | null;
  confidence: ParseConfidence;
} {
  const found = new Set<PlannerGyeonggiZoneKey>();
  let source: string | null = null;
  for (const { zone, re } of GYEONGGI_ZONE_REGEX) {
    const m = text.match(re);
    if (m?.[0]) {
      found.add(zone);
      source = source ? `${source}, ${m[0]}` : m[0];
    }
  }
  if (found.size === 0) {
    return { zones: [], source: null, confidence: "low" };
  }
  return {
    zones: [...found],
    source,
    confidence: "high",
  };
}

function scanIncheonZones(text: string): {
  zones: PlannerIncheonZoneKey[];
  source: string | null;
  confidence: ParseConfidence;
} {
  const found = new Set<PlannerIncheonZoneKey>();
  let source: string | null = null;
  for (const { zone, re } of INCHEON_ZONE_REGEX) {
    const m = text.match(re);
    if (m?.[0]) {
      found.add(zone);
      source = source ? `${source}, ${m[0]}` : m[0];
    }
  }
  if (found.size === 0) {
    return { zones: [], source: null, confidence: "low" };
  }
  return {
    zones: [...found],
    source,
    confidence: "high",
  };
}

function parseRegions(text: string): {
  regions: ParsedField<string[]>;
  seoulZones: ParsedField<PlannerSeoulZoneKey[]>;
  busanZones: ParsedField<PlannerBusanZoneKey[]>;
  gyeonggiZones: ParsedField<PlannerGyeonggiZoneKey[]>;
  incheonZones: ParsedField<PlannerIncheonZoneKey[]>;
} {
  const allHits = [
    ...scanHotspots(text),
    ...scanBrowseRegions(text),
    ...scanMacroRegions(text),
  ];

  const macroSet = new Set<string>();
  const zoneSet = new Set<PlannerSeoulZoneKey>();
  const busanZoneSet = new Set<PlannerBusanZoneKey>();
  const gyeonggiZoneSet = new Set<PlannerGyeonggiZoneKey>();
  const incheonZoneSet = new Set<PlannerIncheonZoneKey>();
  const sources: string[] = [];

  for (const hit of allHits) {
    if (hit.mainId === "national") {
      macroSet.add("national");
    } else {
      macroSet.add(hit.mainId);
    }
    sources.push(hit.source);
    if (hit.subId && hit.mainId === "seoul") {
      const zone = BROWSE_SUB_TO_SEOUL_ZONE[hit.subId];
      if (zone) zoneSet.add(zone);
    }
    if (hit.subId && hit.mainId === "busan") {
      const zone = BROWSE_SUB_TO_BUSAN_ZONE[hit.subId];
      if (zone) busanZoneSet.add(zone);
    }
    if (hit.subId && hit.mainId === "gyeonggi") {
      const zone = BROWSE_SUB_TO_GYEONGGI_ZONE[hit.subId];
      if (zone) gyeonggiZoneSet.add(zone);
    }
    if (hit.subId && hit.mainId === "incheon") {
      const zone = BROWSE_SUB_TO_INCHEON_ZONE[hit.subId];
      if (zone) incheonZoneSet.add(zone);
    }
  }

  const zoneScan = scanSeoulZones(text);
  for (const z of zoneScan.zones) zoneSet.add(z);
  if (zoneScan.source) sources.push(zoneScan.source);

  const busanZoneScan = scanBusanZones(text);
  for (const z of busanZoneScan.zones) busanZoneSet.add(z);
  if (busanZoneScan.source) sources.push(busanZoneScan.source);

  const gyeonggiZoneScan = scanGyeonggiZones(text);
  for (const z of gyeonggiZoneScan.zones) gyeonggiZoneSet.add(z);
  if (gyeonggiZoneScan.source) sources.push(gyeonggiZoneScan.source);

  const incheonZoneScan = scanIncheonZones(text);
  for (const z of incheonZoneScan.zones) incheonZoneSet.add(z);
  if (incheonZoneScan.source) sources.push(incheonZoneScan.source);

  if (zoneSet.size > 0 && !macroSet.has("national")) {
    macroSet.add("seoul");
  }
  if (busanZoneSet.size > 0 && !macroSet.has("national")) {
    macroSet.add("busan");
  }
  if (gyeonggiZoneSet.size > 0 && !macroSet.has("national")) {
    macroSet.add("gyeonggi");
  }
  if (incheonZoneSet.size > 0 && !macroSet.has("national")) {
    macroSet.add("incheon");
  }

  const regionsArr = [...macroSet];
  const zonesArr = [...zoneSet];
  const busanZonesArr = [...busanZoneSet];
  const gyeonggiZonesArr = [...gyeonggiZoneSet];
  const incheonZonesArr = [...incheonZoneSet];

  return {
    regions:
      regionsArr.length > 0
        ? field(regionsArr, "high", sources.join(", "))
        : emptyField(),
    seoulZones:
      zonesArr.length > 0
        ? field(
            zonesArr,
            zoneScan.confidence,
            zoneScan.source ?? sources.join(", "),
          )
        : emptyField(),
    busanZones:
      busanZonesArr.length > 0
        ? field(
            busanZonesArr,
            busanZoneScan.confidence,
            busanZoneScan.source ?? sources.join(", "),
          )
        : emptyField(),
    gyeonggiZones:
      gyeonggiZonesArr.length > 0
        ? field(
            gyeonggiZonesArr,
            gyeonggiZoneScan.confidence,
            gyeonggiZoneScan.source ?? sources.join(", "),
          )
        : emptyField(),
    incheonZones:
      incheonZonesArr.length > 0
        ? field(
            incheonZonesArr,
            incheonZoneScan.confidence,
            incheonZoneScan.source ?? sources.join(", "),
          )
        : emptyField(),
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseIndustryKey(text: string): ParsedField<PlannerIndustryKey> {
  const lower = text.toLowerCase();

  for (const { key, patterns } of SUPPLEMENTAL_INDUSTRY) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m?.[0]) {
        return field(key, "high", m[0]);
      }
    }
  }

  type Scored = { key: PlannerIndustryKey; hint: string; len: number };
  const scored: Scored[] = [];

  for (const [key, hints] of Object.entries(PLANNER_INDUSTRY_HINTS)) {
    for (const hint of hints) {
      const h = hint.toLowerCase();
      const isCjk = /[\u3130-\u318f\uac00-\ud7af]/.test(hint);
      if (isCjk) {
        if (text.includes(hint)) {
          scored.push({
            key: key as PlannerIndustryKey,
            hint,
            len: hint.length,
          });
        }
      } else if (h.length <= 2) {
        const re = new RegExp(`\\b${escapeRegExp(h)}\\b`, "i");
        if (re.test(lower)) {
          scored.push({
            key: key as PlannerIndustryKey,
            hint,
            len: h.length,
          });
        }
      } else if (lower.includes(h)) {
        scored.push({
          key: key as PlannerIndustryKey,
          hint,
          len: h.length,
        });
      }
    }
  }

  if (scored.length === 0) return emptyField();
  scored.sort((a, b) => b.len - a.len);
  const best = scored[0]!;
  return field(best.key, best.len >= 3 ? "high" : "low", best.hint);
}

const CATEGORY_ORDER: PlannerCategory[] = ["digital", "static", "mobile"];

/** 이동형 매체 키워드 — 버스·택시·래핑·차량·트럭·모빌리티 등 */
const MOBILE_CATEGORY_RE =
  /버스|택시(?:\s*(?:래핑|광고|광고차))?|택시래핑|택시광고|래핑|차량|트럭|모빌리티|이동형|bus\b|taxi|vehicle\s*wrap|truck|mobility/i;

const MOBILE_EXCLUSIVE_RE =
  /(?:버스|택시(?:래핑|광고)?|래핑|차량|트럭|모빌리티|이동형)(?:\s*광고)?\s*만|만\s*(?:버스|택시|래핑|차량|트럭)/i;

/** 매체 유형 키워드 → 플래너 categories (추측 금지·「만」 명시 우선) */
export function parseCategories(text: string): ParsedField<PlannerCategory[]> {
  const exclusiveSubway = text.match(
    /지하철(?:\s*광고)?\s*만|만\s*(?:지하철|지하철\s*광고)/i,
  );
  if (exclusiveSubway) {
    return field(
      ["digital", "mobile"],
      "high",
      exclusiveSubway[0].trim(),
    );
  }

  const exclusiveMobile = text.match(MOBILE_EXCLUSIVE_RE);
  if (exclusiveMobile) {
    return field(["mobile"], "high", exclusiveMobile[0].trim());
  }

  const exclusiveStatic = text.match(
    /(?:옥외|빌보드|고정형)(?:\s*광고)?\s*만|만\s*(?:옥외|빌보드)/i,
  );
  if (exclusiveStatic) {
    return field(["static"], "high", exclusiveStatic[0].trim());
  }

  const exclusiveDigital = text.match(
    /(?:전광판|led|디지털|사이니지)(?:\s*광고)?\s*만|만\s*(?:전광판|디지털)/i,
  );
  if (exclusiveDigital) {
    return field(["digital"], "high", exclusiveDigital[0].trim());
  }

  type Hit = { cat: PlannerCategory; source: string };
  const hits: Hit[] = [];

  const rules: { cat: PlannerCategory; re: RegExp }[] = [
    { cat: "mobile", re: MOBILE_CATEGORY_RE },
    {
      cat: "static",
      re: /옥외|빌보드|고정형|billboard|outdoor(?!\s*digital)/i,
    },
    {
      cat: "digital",
      re: /전광판|led|디지털(?:\s*사이니지)?|사이니지|dooh|signage/i,
    },
    {
      cat: "mobile",
      re: /지하철\s*(?:차내|랩핑|열차)|subway\s*train/i,
    },
    {
      cat: "digital",
      re: /지하철\s*(?:역|역사|승강장|플랫폼|스크린도어)|subway\s*station/i,
    },
    { cat: "digital", re: /2호선\s*(?:역|역사|승강장)/i },
    { cat: "mobile", re: /2호선\s*(?:차내|열차|랩핑)/i },
  ];

  for (const { cat, re } of rules) {
    const m = text.match(re);
    if (m?.[0]) hits.push({ cat, source: m[0].trim() });
  }

  const subwayAmbiguous = text.match(/지하철|subway/i);
  const subwaySpecific = /지하철\s*(?:역|역사|차내|랩핑|열차)|2호선/i.test(
    text,
  );

  if (hits.length === 0 && subwayAmbiguous && !subwaySpecific) {
    return field(
      ["digital", "mobile"],
      "low",
      subwayAmbiguous[0].trim(),
    );
  }

  if (hits.length === 0) return emptyField();

  const cats = CATEGORY_ORDER.filter((c) => hits.some((h) => h.cat === c));
  const sources = [...new Set(hits.map((h) => h.source))];
  const confidence: ParseConfidence =
    subwayAmbiguous && !subwaySpecific && cats.includes("digital") && cats.includes("mobile")
      ? "low"
      : "high";

  return field(cats, confidence, sources.join(", "));
}

function collectUnmatchedTokens(
  text: string,
  fields: PlannerFreetextParseResult["fields"],
): string[] {
  let remaining = text;
  const sources = [
    fields.campaignGoal.source,
    fields.regions.source,
    fields.seoulZones.source,
    fields.ageKeys.source,
    fields.industryKey.source,
    fields.budgetMan.source,
    fields.months.source,
    fields.durationDays.source,
    fields.busanZones.source,
    fields.gyeonggiZones.source,
    fields.incheonZones.source,
    fields.categories.source,
  ].filter(Boolean) as string[];

  for (const src of sources) {
    for (const part of src.split(/[,·]/)) {
      const p = part.trim();
      if (p.length >= 2) {
        remaining = remaining.replace(new RegExp(escapeRegExp(p), "gi"), " ");
      }
    }
  }

  remaining = remaining
    .replace(/\d+(?:\.\d+)?\s*(?:억|천\s*만|천|만)\s*(?:원)?/gi, " ")
    .replace(/[일이삼사오육칠팔구한두세네]+\s*(?:천|백)\s*만/gi, " ")
    .replace(/\d+\s*(?:개월|달|일|주)(?:\s*간)?/gi, " ")
    .replace(/\d{1,2}\s*[/.]\s*\d{1,2}\s*[~\-–]\s*\d{1,2}/gi, " ")
    .replace(/[,.]/g, " ");

  const tokens = remaining
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));

  return [...new Set(tokens)];
}

/**
 * 자유입력 → 플래너 필드 (동기·0토큰·추측 금지).
 * 명시되지 않은 필드는 `value: null`.
 */
export function parsePlannerFreetextBrief(
  raw: string,
): PlannerFreetextParseResult {
  const text = normalizeInput(raw);
  if (!text) {
    const empty = emptyField();
    return {
      raw,
      fields: {
        campaignGoal: empty,
        regions: empty,
        seoulZones: empty,
        ageKeys: empty,
        industryKey: empty,
        budgetMan: empty,
        months: empty,
        durationDays: empty,
        busanZones: empty,
        gyeonggiZones: empty,
        incheonZones: empty,
        categories: empty,
      },
      unmatchedTokens: [],
    };
  }

  const { regions, seoulZones, busanZones, gyeonggiZones, incheonZones } =
    parseRegions(text);
  const duration = parseDurationFields(text);
  const fields = {
    campaignGoal: parseCampaignGoal(text),
    regions,
    seoulZones,
    busanZones,
    gyeonggiZones,
    incheonZones,
    ageKeys: parseAgeKeys(text),
    industryKey: parseIndustryKey(text),
    budgetMan: parseBudgetMan(text),
    months: duration.months,
    durationDays: duration.durationDays,
    categories: parseCategories(text),
  };

  return {
    raw: text,
    fields,
    unmatchedTokens: collectUnmatchedTokens(text, fields),
  };
}

/** 파싱 결과 → `applyScenario` 패치 (미인식 필드는 store 기본·최소값만) */
export function buildScenarioPatchFromFreetextParse(
  result: PlannerFreetextParseResult,
): PlannerScenarioApplyPatch {
  const { fields } = result;
  const zones = fields.seoulZones.value ?? [];
  const busanZones = fields.busanZones.value ?? [];
  const gyeonggiZones = fields.gyeonggiZones.value ?? [];
  const incheonZones = fields.incheonZones.value ?? [];
  let regions = fields.regions.value ?? [];
  if (regions.length === 0 && zones.length > 0) {
    regions = ["seoul"];
  }
  if (regions.length === 0 && busanZones.length > 0) {
    regions = ["busan"];
  }
  if (regions.length === 0 && gyeonggiZones.length > 0) {
    regions = ["gyeonggi"];
  }
  if (regions.length === 0 && incheonZones.length > 0) {
    regions = ["incheon"];
  }

  const durationDays = fields.durationDays.value;
  const goalFollowUp =
    durationDays != null ? { eventDurationDays: durationDays } : undefined;

  return {
    regions: regions.length > 0 ? regions : ["seoul"],
    categories:
      fields.categories.value != null && fields.categories.value.length > 0
        ? [...fields.categories.value]
        : [...PLANNER_DEFAULT_CATEGORIES],
    budgetMan: fields.budgetMan.value ?? PLANNER_BUDGET_MIN,
    months: fields.months.value ?? 1,
    ...(fields.campaignGoal.value != null
      ? { campaignGoal: fields.campaignGoal.value }
      : {}),
    ...(fields.industryKey.value != null
      ? { industryKey: fields.industryKey.value }
      : {}),
    ...(fields.ageKeys.value != null ? { ageKeys: fields.ageKeys.value } : {}),
    ...(zones.length > 0 ? { seoulZones: zones } : {}),
    ...(busanZones.length > 0 ? { busanZones } : {}),
    ...(gyeonggiZones.length > 0 ? { gyeonggiZones } : {}),
    ...(incheonZones.length > 0 ? { incheonZones } : {}),
    ...(goalFollowUp ? { goalFollowUp } : {}),
    appliedScenario: null,
  };
}
