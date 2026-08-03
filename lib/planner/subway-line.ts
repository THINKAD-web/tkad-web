import type { MediaItem } from "@/lib/media-data";

/** Canonical key — `seoul:2`, `daegu:3`, `9`(서울 전용), `arex` 등 */
export type SubwayLineKey = string;

export type SubwayLineRegion =
  | "seoul"
  | "busan"
  | "daegu"
  | "incheon"
  | "gwangju"
  | "daejeon";

export type DetectedSubwayLine = {
  key: SubwayLineKey;
  /** UI·source label e.g. `2호선` */
  labelKo: string;
};

const PROVINCIAL_CITY_PREFIX: Record<string, SubwayLineRegion> = {
  대구: "daegu",
  부산: "busan",
  광주: "gwangju",
  대전: "daejeon",
  인천: "incheon",
};

const REGION_FROM_MAIN: Record<string, SubwayLineRegion> = {
  seoul: "seoul",
  busan: "busan",
  daegu: "daegu",
  incheon: "incheon",
  gwangju: "gwangju",
  daejeon: "daejeon",
};

/** Named lines — longer patterns first */
const NAMED_LINE_RULES: { key: SubwayLineKey; labelKo: string; re: RegExp }[] = [
  { key: "shinbundang", labelKo: "신분당선", re: /신분당\s*선/i },
  { key: "gyeongui-jungang", labelKo: "경의중앙선", re: /경의[\s·]?중앙\s*선/i },
  { key: "gyeongchun", labelKo: "경춘선", re: /경춘\s*선/i },
  { key: "gyeonggang", labelKo: "경강선", re: /경강\s*선/i },
  { key: "gimpo-gold", labelKo: "김포골드라인", re: /김포\s*골드\s*라인|김포골드라인/i },
  { key: "bundang", labelKo: "분당선", re: /분당\s*선/i },
  { key: "seohae", labelKo: "서해선", re: /서해\s*선/i },
  { key: "silim", labelKo: "신림선", re: /신림\s*선/i },
  { key: "ui-sinseol", labelKo: "우이신설선", re: /우이\s*신설\s*선|우이신설선/i },
  { key: "uijeongbu", labelKo: "의정부경전철", re: /의정부\s*경전철|의정부경전철/i },
  { key: "everline", labelKo: "용인경전철", re: /용인\s*경전철|에버\s*라인|everline/i },
  { key: "gtx-a", labelKo: "GTX-A", re: /gtx[\s-]?a/i },
  { key: "arex", labelKo: "공항철도", re: /공항\s*철도|\barex\b/i },
  { key: "incheon1", labelKo: "인천1호선", re: /인천\s*1\s*호선|인천1호선/i },
  { key: "incheon2", labelKo: "인천2호선", re: /인천\s*2\s*호선|인천2호선/i },
];

const PROVINCIAL_LINE_RE =
  /(대구|부산|광주|대전|인천)\s*(?:지하철\s*)?(\d+)\s*호선/i;

const CAPITAL_NUMERIC_LINE_RE = /(\d+)\s*호선/i;

/** 서울에만 있는 노선 — 지역 접두 없이 유지 */
const SEOUL_ONLY_LINE_NUMS = new Set(["9"]);

function regionalNumericKey(
  lineNum: string,
  region: SubwayLineRegion | null,
  defaultSeoul = false,
): SubwayLineKey {
  if (SEOUL_ONLY_LINE_NUMS.has(lineNum)) return lineNum;
  if (region) return `${region}:${lineNum}`;
  if (defaultSeoul) return `seoul:${lineNum}`;
  return lineNum;
}

function inferRegionFromHaystack(hay: string): SubwayLineRegion | null {
  for (const [ko, id] of Object.entries(PROVINCIAL_CITY_PREFIX)) {
    if (hay.includes(ko)) return id;
  }
  if (/서울|수도권|경기|성남|강남|여의도|잠실|을지로/i.test(hay)) {
    if (!/(대구|부산|광주|대전|인천)/i.test(hay)) return "seoul";
  }
  return null;
}

function inferRegionFromMedia(m: MediaItem, hay: string): SubwayLineRegion | null {
  const main = m.regionMain?.trim();
  if (main && main in REGION_FROM_MAIN) {
    return REGION_FROM_MAIN[main]!;
  }
  const legacy = m.region?.trim();
  if (legacy && legacy in REGION_FROM_MAIN) {
    return REGION_FROM_MAIN[legacy]!;
  }
  return inferRegionFromHaystack(hay);
}

type ParsedRegionalKey = { region?: SubwayLineRegion; line: string };

function parseRegionalLineKey(key: string): ParsedRegionalKey | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (/^[a-z]+:\d+$/i.test(trimmed)) {
    const idx = trimmed.indexOf(":");
    return {
      region: trimmed.slice(0, idx) as SubwayLineRegion,
      line: trimmed.slice(idx + 1),
    };
  }
  if (/^\d+$/.test(trimmed)) {
    return { line: trimmed };
  }
  return null;
}

export function parseSubwayLineFromText(
  text: string,
): DetectedSubwayLine | null {
  const t = text.trim();
  if (!t) return null;

  for (const rule of NAMED_LINE_RULES) {
    const m = t.match(rule.re);
    if (m?.[0]) {
      return { key: rule.key, labelKo: rule.labelKo };
    }
  }

  const prov = t.match(PROVINCIAL_LINE_RE);
  if (prov?.[1] && prov[2]) {
    const prefix = PROVINCIAL_CITY_PREFIX[prov[1]];
    if (prefix) {
      return {
        key: `${prefix}:${prov[2]}`,
        labelKo: `${prov[1]} ${prov[2]}호선`,
      };
    }
  }

  const num = t.match(CAPITAL_NUMERIC_LINE_RE);
  if (num?.[1]) {
    return {
      key: regionalNumericKey(num[1], null, true),
      labelKo: `${num[1]}호선`,
    };
  }

  return null;
}

export function mediaSubwayLineHaystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.subCategory,
    m.mediaSubCategory,
    ...(m.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

/** 매체명·위치·regionMain 에서 노선 추출 */
export function detectMediaSubwayLine(m: MediaItem): DetectedSubwayLine | null {
  const hay = mediaSubwayLineHaystack(m);

  for (const rule of NAMED_LINE_RULES) {
    if (rule.re.test(hay)) {
      return { key: rule.key, labelKo: rule.labelKo };
    }
  }

  const prov = hay.match(PROVINCIAL_LINE_RE);
  if (prov?.[1] && prov[2]) {
    const prefix = PROVINCIAL_CITY_PREFIX[prov[1]];
    if (prefix) {
      return {
        key: `${prefix}:${prov[2]}`,
        labelKo: `${prov[1]} ${prov[2]}호선`,
      };
    }
  }

  const num = hay.match(CAPITAL_NUMERIC_LINE_RE);
  if (num?.[1]) {
    const region = inferRegionFromMedia(m, hay);
    return {
      key: regionalNumericKey(num[1], region, region == null && /지하철/i.test(hay)),
      labelKo: `${num[1]}호선`,
    };
  }

  return null;
}

export function subwayLinesMatch(
  queryKey: SubwayLineKey,
  mediaKey: SubwayLineKey,
): boolean {
  const q = queryKey.trim();
  const m = mediaKey.trim();
  if (q === m) return true;

  if (q === "9" && (m === "9" || m === "seoul:9")) return true;

  const qParts = parseRegionalLineKey(q);
  const mParts = parseRegionalLineKey(m);
  if (!qParts || !mParts) return false;
  if (qParts.line !== mParts.line) return false;

  if (qParts.region && mParts.region) {
    return qParts.region === mParts.region;
  }

  return false;
}
