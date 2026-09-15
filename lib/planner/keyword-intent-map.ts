import type { MediaItem } from "@/lib/media-data";
import type { PlannerCategory } from "@/lib/planner/types";

/** OOH freetext 매체 intent — subway/bus_shelter 등 legacy + 확장 */
export type OohKeywordIntent =
  | "subway"
  | "bus_wrap"
  | "billboard"
  | "bus_shelter"
  | "airport"
  | "subway_psd"
  | "mall"
  | "rooftop"
  | "highway"
  | "ktx"
  | "kiosk"
  | "escalator"
  | "convenience_store"
  | "gas_station"
  | "cinema"
  | "stadium"
  | "walkway"
  | "aircraft"
  | "banner"
  | "apartment"
  | "exterior_wall"
  | "rail_station"
  | "experiential_ooh";

export type OohKeywordIntentEntry = {
  intent: OohKeywordIntent;
  /** 긴 패턴 우선 — substring 충돌 최소화 */
  patterns: readonly string[];
  categories: readonly PlannerCategory[];
  /** 매칭 엔진 media 가점용 haystack 규칙 */
  mediaHaystackRe: RegExp;
};

/** standalone 버스 — 「네이버」의 「버스」 부분 일치 방지 */
export const STANDALONE_BUS_RE = /(?<![이])버스/i;

function primaryHaystack(item: MediaItem): string {
  return [
    item.name,
    item.nameEn,
    item.subCategory,
    item.mediaSubCategory,
    item.networkSubtype,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export const OOH_KEYWORD_INTENTS: readonly OohKeywordIntentEntry[] = [
  {
    intent: "subway_psd",
    patterns: ["스크린도어", "화면도어", "PSD", "platform screen door"],
    categories: ["digital"],
    mediaHaystackRe:
      /스크린\s*도어|화면\s*도어|\bpsd\b|platform\s*screen|승강장\s*안전\s*문/i,
  },
  {
    intent: "subway",
    patterns: [
      "지하철 디지털포스터",
      "지하철디지털포스터",
      "지하철 기둥",
      "지하철기둥",
      "지하철 벽면",
      "지하철 액자",
      "지하철 편성",
      "디지털포스터",
      "e-Vision",
      "eVision",
      "맥스비전",
      "I-SCREEN",
      "ISCREEN",
      "CM보드",
      "전철광고",
      "전철",
      "지하철광고",
      "지하철역사",
      "지하철역",
      "지하철",
      "subway",
      "metro",
      "전동차",
    ],
    categories: ["digital", "mobile"],
    mediaHaystackRe:
      /지하철|subway|역사|플랫폼|승강장|호선.*역|cm\s*board|cm보드/i,
  },
  {
    intent: "bus_shelter",
    patterns: [
      "버스쉘터",
      "버스 쉘터",
      "스마트쉘터",
      "스마트 쉘터",
      "bus shelter",
      "smart shelter",
      "쉘터",
      "shelter",
    ],
    categories: ["static"],
    mediaHaystackRe:
      /쉘터|shelter|버스\s*쉘터|버스쉘터|스마트\s*쉘터|정류장\s*(?:디지털\s*)?쉘터|bus_shelter/i,
  },
  {
    intent: "bus_wrap",
    patterns: [
      "랩핑광고",
      "래핑광고",
      "버스래핑",
      "버스 래핑",
      "bus wrap",
      "버스랩핑",
      "버스 랩핑",
    ],
    categories: ["mobile"],
    mediaHaystackRe:
      /(?:버스|bus)(?:\s*(?:래핑|랩핑|wrap|외부|exterior))|(?:래핑|랩핑|wrap).*(?:버스|bus)|vehicle\s*wrap|bus_wrap/i,
  },
  {
    intent: "billboard",
    patterns: [
      "전광판",
      "빌보드",
      "billboard",
      "미디어월",
      "미디어파사드",
      "미디어 타워",
      "미디어타워",
      "LED",
      "led",
      "dooh",
      "사이니지",
      "signage",
    ],
    categories: ["digital"],
    mediaHaystackRe:
      /전광판|빌보드|billboard|미디어\s*(?:월|타워|파사드)|미디어월|미디어타워|led|사이니지|signage|digital[\s_-]?signage/i,
  },
  {
    intent: "airport",
    patterns: ["공항광고", "공항", "airport", "인천공항", "김포공항", "제주공항"],
    categories: ["digital"],
    mediaHaystackRe: /공항|airport|터미널\s*\d|incheon|kimpo|jeju\s*air/i,
  },
  {
    intent: "mall",
    patterns: ["쇼핑몰", "백화점", "mall", "department store", "아울렛"],
    categories: ["digital"],
    mediaHaystackRe:
      /쇼핑\s*몰|shopping\s*mall|백화점|department|아울렛|outlet|mall(?!\w)/i,
  },
  {
    intent: "rooftop",
    patterns: ["옥상광고", "옥상간판", "옥상"],
    categories: ["static"],
    mediaHaystackRe: /옥상|rooftop|roof\s*top/i,
  },
  {
    intent: "highway",
    patterns: ["고속도로", "휴게소", "highway", "rest area"],
    categories: ["static", "digital"],
    mediaHaystackRe: /고속\s*도로|휴게\s*소|highway|rest\s*area|rest\s*stop/i,
  },
  {
    intent: "ktx",
    patterns: ["KTX", "ktx", "고속철도", "SRT"],
    categories: ["digital", "mobile"],
    mediaHaystackRe: /ktx|srt|고속\s*철도|ktx_terminal/i,
  },
  {
    intent: "kiosk",
    patterns: ["키오스크", "kiosk"],
    categories: ["digital"],
    mediaHaystackRe: /키오스크|kiosk/i,
  },
  {
    intent: "escalator",
    patterns: ["에스컬레이터", "escalator"],
    categories: ["digital"],
    mediaHaystackRe: /에스컬레이터|escalator/i,
  },
  {
    intent: "convenience_store",
    patterns: ["편의점", "convenience store", "CVS"],
    categories: ["digital"],
    mediaHaystackRe: /편의\s*점|convenience|cu\b|gs25|seven\s*eleven/i,
  },
  {
    intent: "gas_station",
    patterns: ["주유소", "gas station", "캐노피"],
    categories: ["digital", "static"],
    mediaHaystackRe: /주유\s*소|gas\s*station|캐노피|canopy/i,
  },
  {
    intent: "cinema",
    patterns: ["영화관", "cinema", "multiplex"],
    categories: ["digital"],
    mediaHaystackRe: /영화\s*관|cinema|multiplex|cgv|lotte\s*cinema|megabox/i,
  },
  {
    intent: "stadium",
    patterns: ["경기장", "스타디움", "stadium", "arena"],
    categories: ["digital"],
    mediaHaystackRe: /경기\s*장|스타디움|stadium|arena|체육\s*관/i,
  },
  {
    intent: "walkway",
    patterns: ["보행로", "보행자", "walkway"],
    categories: ["static", "digital"],
    mediaHaystackRe: /보행\s*로|보행\s*자|walkway|pedestrian/i,
  },
  {
    intent: "aircraft",
    patterns: ["항공기", "inflight", "기내", "in-flight"],
    categories: ["mobile"],
    mediaHaystackRe: /항공\s*기|in[\s-]?flight|기내|inflight|aircraft/i,
  },
  {
    intent: "banner",
    patterns: ["현수막", "banner"],
    categories: ["static"],
    mediaHaystackRe: /현수\s*막|banner(?!\s*ad)/i,
  },
  {
    intent: "apartment",
    patterns: ["아파트광고", "아파트"],
    categories: ["static", "digital"],
    mediaHaystackRe: /아파트|apartment/i,
  },
  {
    intent: "exterior_wall",
    patterns: ["외벽광고", "건물외벽", "외벽", "wallscape"],
    categories: ["static"],
    mediaHaystackRe: /외벽|wallscape|wall\s*scape|facade/i,
  },
  {
    intent: "rail_station",
    patterns: ["역사광고", "철도광고", "철도역", "기차역"],
    categories: ["digital", "mobile"],
    mediaHaystackRe: /역\s*사|station|rail|철도|ktx|srt|기차\s*역/i,
  },
  {
    intent: "experiential_ooh",
    patterns: [
      "체험형OOH",
      "체험형 OOH",
      "체험형옥외",
      "체험형 옥외",
      "experiential OOH",
      "experiential",
    ],
    categories: ["static", "digital"],
    mediaHaystackRe:
      /체험\s*형|experiential|체험\s*공간|프로모션\s*존|체류형|브랜드\s*체험/i,
  },
];

/** 패턴 → RegExp (긴 패턴 우선, 버스는 standalone) */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (pattern.toLowerCase() === "버스" || pattern === "bus") {
    return STANDALONE_BUS_RE;
  }
  if (/^[A-Za-z0-9\-]+$/.test(pattern)) {
    return new RegExp(`\\b${escaped}\\b`, "i");
  }
  return new RegExp(escaped, "i");
}

/** 충돌 검사·디버그용 — 등록된 패턴 전체 */
export function compileOohKeywordPatternRegexes(): {
  intent: OohKeywordIntent;
  pattern: string;
  re: RegExp;
}[] {
  const out: { intent: OohKeywordIntent; pattern: string; re: RegExp }[] = [];
  for (const entry of OOH_KEYWORD_INTENTS) {
    const sorted = [...entry.patterns].sort((a, b) => b.length - a.length);
    for (const pattern of sorted) {
      out.push({ intent: entry.intent, pattern, re: patternToRegex(pattern) });
    }
  }
  return out;
}

export function parseOohKeywordIntentsFromText(text: string): OohKeywordIntent[] {
  const t = text.trim();
  if (!t) return [];

  const found = new Set<OohKeywordIntent>();
  for (const entry of OOH_KEYWORD_INTENTS) {
    const sorted = [...entry.patterns].sort((a, b) => b.length - a.length);
    for (const pattern of sorted) {
      if (patternToRegex(pattern).test(t)) {
        found.add(entry.intent);
        break;
      }
    }
  }

  // standalone 버스 → mobile 보조 (래핑·쉘터·지하철 등 다른 intent 없을 때)
  if (
    STANDALONE_BUS_RE.test(t) &&
    !found.has("bus_wrap") &&
    !found.has("bus_shelter") &&
    !found.has("subway")
  ) {
    // 버스 단독은 categories mobile — intent는 bus_wrap 아님, subway도 아님
    // legacy: parseCategories mobile rule — intent 없이 category만
  }

  return [...found];
}

export function detectOohMediaKeywordPresence(text: string): boolean {
  if (parseOohKeywordIntentsFromText(text).length > 0) return true;

  const categoryHints =
    /옥외|빌보드|outdoor|고정형|static|전광판|led|디지털|사이니지|dooh|signage|택시|taxi|래핑|wrap|랩핑/i;
  if (categoryHints.test(text)) return true;

  if (STANDALONE_BUS_RE.test(text)) return true;

  return false;
}

export function categoriesFromOohIntents(
  intents: readonly OohKeywordIntent[],
): PlannerCategory[] {
  const cats = new Set<PlannerCategory>();
  for (const intent of intents) {
    const entry = OOH_KEYWORD_INTENTS.find((e) => e.intent === intent);
    if (entry) {
      for (const c of entry.categories) cats.add(c);
    }
  }
  const order: PlannerCategory[] = ["digital", "static", "mobile"];
  return order.filter((c) => cats.has(c));
}

export function mediaMatchesOohIntent(
  item: MediaItem,
  intent: OohKeywordIntent,
): boolean {
  const entry = OOH_KEYWORD_INTENTS.find((e) => e.intent === intent);
  if (!entry) return false;

  const hay = primaryHaystack(item);
  if (!hay.trim()) return false;

  if (!entry.mediaHaystackRe.test(hay)) return false;

  // intent별 제외 규칙
  if (intent === "billboard") {
    if (
      /아트래핑|vehicle\s*wrap|bus\s*wrap|쉘터|shelter|키오스크|kiosk/i.test(hay) &&
      !/전광판|빌보드|billboard|led|사이니지/i.test(hay)
    ) {
      return false;
    }
  }
  if (intent === "airport") {
    if (/택시|taxi/i.test(hay) && !/공항|airport/i.test(hay)) return false;
  }
  if (intent === "bus_shelter") {
    if (
      /지하철|subway|역사[\s_(]|platform|screendoor/i.test(hay) &&
      !/쉘터|shelter|bus_shelter/i.test(hay)
    ) {
      return false;
    }
  }
  if (intent === "mall") {
    if (/지하철|subway/i.test(hay) && !/쇼핑|mall|백화점/i.test(hay)) {
      return false;
    }
  }

  return true;
}

export function lookupOohIntentEntry(
  intent: OohKeywordIntent,
): OohKeywordIntentEntry | undefined {
  return OOH_KEYWORD_INTENTS.find((e) => e.intent === intent);
}
