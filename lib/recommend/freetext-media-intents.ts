/** 자연어에서 추출한 매체 유형 의도 — scoreCategory 가점·감점 */
export type FreetextMediaIntent =
  | "subway"
  | "bus_wrap"
  | "billboard"
  | "delivery_vehicle"
  | "bus_shelter"
  | "train_station"
  | "express_bus_terminal"
  | "intercity_bus_terminal";

export type MediaIntentCatalogEntry = {
  intent: FreetextMediaIntent;
  /** 카탈로그 browse sub 또는 metric class */
  catalogSubCategories: string[];
  available: boolean;
  noteKo: string;
};

/** SSOT — intent ↔ 카탈로그 가용성 (없으면 available:false) */
export const MEDIA_INTENT_CATALOG: Record<FreetextMediaIntent, MediaIntentCatalogEntry> = {
  subway: {
    intent: "subway",
    catalogSubCategories: ["subway_station", "subway_train"],
    available: true,
    noteKo: "지하철 역사·차량 (subway_station ~135건)",
  },
  bus_wrap: {
    intent: "bus_wrap",
    catalogSubCategories: ["bus_exterior", "bus_wrap"],
    available: true,
    noteKo: "버스·택시 래핑",
  },
  billboard: {
    intent: "billboard",
    catalogSubCategories: ["digital_signage"],
    available: true,
    noteKo: "전광판·빌보드·LED",
  },
  delivery_vehicle: {
    intent: "delivery_vehicle",
    catalogSubCategories: ["vehicle_wrap"],
    available: true,
    noteKo: "차량 래핑(vehicle_wrap ~5건, 택배 전용 slug 없음 — generic wrap)",
  },
  bus_shelter: {
    intent: "bus_shelter",
    catalogSubCategories: ["bus_shelter", "digital_shelter"],
    available: true,
    noteKo: "버스 쉘터 (~6–14건)",
  },
  train_station: {
    intent: "train_station",
    catalogSubCategories: ["ktx_terminal", "subway_station"],
    available: true,
    noteKo: "KTX/기차역 — ktx_terminal bucket + KTX명 subway_station 혼재",
  },
  express_bus_terminal: {
    intent: "express_bus_terminal",
    catalogSubCategories: ["ktx_terminal", "digital_signage"],
    available: true,
    noteKo: "고속버스터미널 전용 slug 없음 — ktx_terminal·digital_signage 이름 매칭 (~3–4건)",
  },
  intercity_bus_terminal: {
    intent: "intercity_bus_terminal",
    catalogSubCategories: [],
    available: false,
    noteKo: "시외버스터미널 전용 유형·매체 없음 — 매칭 불가",
  },
};

export type MediaIntentCondition = {
  intent: FreetextMediaIntent;
  condition: string;
  labelKo: string;
};

export type ParsedFreetextMediaIntents = {
  intents: FreetextMediaIntent[];
  unavailable: MediaIntentCatalogEntry[];
  available: MediaIntentCatalogEntry[];
  conditions: MediaIntentCondition[];
  sources: Partial<Record<FreetextMediaIntent, string>>;
};

function addIntent(
  intents: Set<FreetextMediaIntent>,
  sources: Partial<Record<FreetextMediaIntent, string>>,
  intent: FreetextMediaIntent,
  source: string,
): void {
  intents.add(intent);
  if (!sources[intent]) sources[intent] = source;
}

export function parseFreetextMediaIntents(text: string): FreetextMediaIntent[] {
  return parseFreetextMediaIntentsDetailed(text).intents;
}

export function parseFreetextMediaIntentsDetailed(
  text: string,
): ParsedFreetextMediaIntents {
  const t = text.trim();
  const intents = new Set<FreetextMediaIntent>();
  const sources: Partial<Record<FreetextMediaIntent, string>> = {};
  const conditions: MediaIntentCondition[] = [];

  if (!t) {
    return { intents: [], unavailable: [], available: [], conditions, sources };
  }

  if (/택배\s*(?:차량|트럭|카보|배송)|delivery\s*(?:vehicle|truck|van)/i.test(t)) {
    addIntent(intents, sources, "delivery_vehicle", "택배차량");
  }

  const subwayConditional =
    /지하철\s*(?:광고)?\s*[(\（]?\s*지하철\s*(?:있는|운행|노선)\s*지역\s*만/i.test(t) ||
    /지하철\s*(?:있는|운행)\s*지역\s*만/i.test(t);
  if (/지하철|subway/i.test(t)) {
    addIntent(intents, sources, "subway", "지하철");
    if (subwayConditional) {
      conditions.push({
        intent: "subway",
        condition: "subway_where_available",
        labelKo: "지하철 있는 지역만",
      });
    }
  }

  if (
    /(?:\d+\s*호선|신분당\s*선|경의[\s·]?중앙\s*선|공항\s*철도|\barex\b|분당\s*선|인천\s*[12]\s*호선)/i.test(
      t,
    )
  ) {
    addIntent(intents, sources, "subway", "지하철 노선");
  }

  if (
    /버스\s*(?:래핑|랩핑|wrap)|(?:래핑|랩핑|wrap)\s*버스|bus\s*wrap/i.test(t)
  ) {
    addIntent(intents, sources, "bus_wrap", "버스 래핑");
  }

  if (/버스\s*정류장|버스정류장|bus\s*shelter|스마트\s*쉘터/i.test(t)) {
    addIntent(intents, sources, "bus_shelter", "버스 정류장");
  }

  if (
    /(?:기차역|ktx\s*역|ktx역|srt\s*역)/i.test(t) ||
    (/역사\s*광고/i.test(t) && !/지하철\s*역사/i.test(t))
  ) {
    addIntent(intents, sources, "train_station", "기차역/KTX역");
  }

  if (
    /시외\s*[·•]?\s*고속\s*버스\s*터미널|고속\s*버스\s*터미널|고속버스터미널/i.test(t)
  ) {
    addIntent(intents, sources, "express_bus_terminal", "시외·고속버스터미널");
  }
  if (/시외\s*버스\s*터미널|시외버스터미널/i.test(t)) {
    addIntent(intents, sources, "intercity_bus_terminal", "시외버스터미널");
  }

  if (
    /전광판|빌보드|billboard|미디어\s*(?:월|타워|파사드)|미디어월|미디어타워|led\s*(?:전광|보드|스크린)?/i.test(
      t,
    )
  ) {
    addIntent(intents, sources, "billboard", "전광판");
  }

  const intentList = [...intents];
  const available: MediaIntentCatalogEntry[] = [];
  const unavailable: MediaIntentCatalogEntry[] = [];

  for (const intent of intentList) {
    const entry = MEDIA_INTENT_CATALOG[intent];
    if (entry.available) available.push(entry);
    else unavailable.push(entry);
  }

  return { intents: intentList, unavailable, available, conditions, sources };
}

/** 지역 스코어·하드필터 보조 — 파싱 원문 키워드 */
export function extractFreetextLocationKeywords(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const kws: string[] = [];
  const rules: { kw: string; re: RegExp }[] = [
    { kw: "기장", re: /기장(?:군|읍)?/i },
    { kw: "울주", re: /울주(?:군|읍)?/i },
    { kw: "영광", re: /영광(?:군|읍)?/i },
    { kw: "경주", re: /경주(?:시|읍)?/i },
    { kw: "명동", re: /명동/i },
    { kw: "을지로", re: /을지로/i },
    { kw: "광화문", re: /광화문/i },
    { kw: "종로", re: /종로/i },
    { kw: "강남", re: /강남/i },
    { kw: "성수", re: /성수/i },
    { kw: "홍대", re: /홍대/i },
    { kw: "신촌", re: /신촌/i },
    { kw: "합정", re: /합정/i },
    { kw: "해운대", re: /해운대/i },
  ];

  for (const { kw, re } of rules) {
    if (re.test(t) && !kws.includes(kw)) kws.push(kw);
  }

  return kws;
}

/** 지하철 미운행 광역 — subway conditional 시 제외 */
export const SUBWAY_MACRO_REGIONS = new Set([
  "seoul",
  "busan",
  "daegu",
  "incheon",
  "gyeonggi",
  "daejeon",
  "gwangju",
]);

export function regionHasSubway(macroRegion: string): boolean {
  return SUBWAY_MACRO_REGIONS.has(macroRegion);
}
