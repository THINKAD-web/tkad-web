import type { MediaItem } from "@/lib/media-data";
import {
  getBrowseRegionSub,
  type BrowseRegionSub,
} from "@/lib/media-browse-regions";
import type { RegionFilterSigunguCodes } from "@/lib/media-map/coverage-region-match";

/** browse sub chip — main.label/id 제외 (서울·인천 등 광역명으로 전체 오매칭 방지) */
export function browseSubHaystackAliases(sub: BrowseRegionSub): string[] {
  return [sub.label, ...(sub.aliases ?? [])];
}

/** alias fallback — name·location·district 중심 (nearbyLandmarks·tags 제외) */
export function mediaRegionAliasHaystack(m: MediaItem): string {
  const parts: string[] = [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.city,
    m.district,
  ];

  for (const loc of m.installLocations ?? []) {
    parts.push(loc.label, loc.location);
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

function haystackAliasesForSub(sub: BrowseRegionSub, subId: string): string[] {
  let aliases = browseSubHaystackAliases(sub).filter(aliasAllowedForHaystackFallback);
  if (subId === "incheon_airport") {
    // 인천공항 직접 언급만 (공항철도·영종 AREX 역사 오매칭 제외)
    aliases = aliases.filter((a) => /인천.*공항/i.test(a));
  } else if (subId === "jeju_airport") {
    aliases = aliases.filter((a) => /제주.*공항/i.test(a));
  }
  return aliases;
}

const SHORT_ASCII_ALIASES = new Set(["t1", "t2"]);

function aliasAllowedForHaystackFallback(alias: string): boolean {
  const token = alias.trim().toLowerCase();
  if (token.length < 2) return false;
  if (SHORT_ASCII_ALIASES.has(token)) return false;
  if (token === "airport") return false;
  return true;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 지명 alias — 부분 문자열 금지, 토큰(단어) 경계 일치 (남포동·서면역 등 접미 허용) */
export function aliasMatchesHaystackToken(alias: string, haystack: string): boolean {
  const token = alias.trim().toLowerCase();
  if (token.length < 2) return false;

  const boundary = "(?<![가-힣a-z0-9])";
  const boundaryEnd = "(?![가-힣a-z0-9])";
  const placeSuffix = "(?:동|역|가|로|길|구|시|군|면|읍)?";
  const re = new RegExp(
    `${boundary}${escapeRegex(token)}${placeSuffix}${boundaryEnd}`,
    "i",
  );
  return re.test(haystack);
}

type SidoKey =
  | "seoul"
  | "busan"
  | "daegu"
  | "incheon"
  | "gwangju"
  | "daejeon"
  | "ulsan"
  | "gyeonggi"
  | "gangwon"
  | "jeju"
  | "chungcheong"
  | "gyeongsang"
  | "jeolla";

const SIDO_DETECTORS: { key: SidoKey; patterns: RegExp[] }[] = [
  { key: "seoul", patterns: [/서울특별시/, /(?<![가-힣])서울(?![특가-힣])/] },
  { key: "busan", patterns: [/부산광역시/, /(?<![가-힣])부산(?![가-힣])/] },
  { key: "daegu", patterns: [/대구광역시/, /(?<![가-힣])대구(?![가-힣])/] },
  { key: "incheon", patterns: [/인천광역시/, /인천국제공항/, /(?<![가-힣])인천(?![가-힣])/] },
  { key: "gwangju", patterns: [/광주광역시/, /(?<![가-힣])광주(?![가-힣])/] },
  { key: "daejeon", patterns: [/대전광역시/, /(?<![가-힣])대전(?![가-힣])/] },
  { key: "ulsan", patterns: [/울산광역시/, /(?<![가-힣])울산(?![가-힣])/] },
  { key: "gyeonggi", patterns: [/경기도/, /(?<![가-힣])경기(?![가-힣])/] },
  { key: "gangwon", patterns: [/강원특별자치도/, /강원도/, /(?<![가-힣])강원(?![가-힣])/] },
  { key: "jeju", patterns: [/제주특별자치도/, /(?<![가-힣])제주(?![가-힣])/] },
  { key: "chungcheong", patterns: [/충청북도/, /충청남도/, /세종특별자치시/, /(?<![가-힣])충북(?![가-힣])/, /(?<![가-힣])충남(?![가-힣])/] },
  { key: "gyeongsang", patterns: [/경상북도/, /경상남도/, /(?<![가-힣])경북(?![가-힣])/, /(?<![가-힣])경남(?![가-힣])/] },
  { key: "jeolla", patterns: [/전라북도/, /전라남도/, /(?<![가-힣])전북(?![가-힣])/, /(?<![가-힣])전남(?![가-힣])/] },
];

/** browse main.id → 허용 시·도 (alias haystack 내 타 광역 시도명 = 차단) */
const ALLOWED_SIDO_FOR_MAIN: Record<string, readonly SidoKey[]> = {
  seoul: ["seoul", "gyeonggi"],
  gyeonggi: ["seoul", "gyeonggi", "incheon"],
  incheon: ["incheon", "seoul", "gyeonggi"],
  busan: ["busan", "gyeongsang"],
  daegu: ["daegu", "gyeongsang"],
  daejeon: ["daejeon", "chungcheong"],
  gwangju: ["gwangju", "jeolla"],
  ulsan: ["ulsan", "gyeongsang"],
  gangwon: ["gangwon", "gyeongsang"],
  jeju: ["jeju"],
  chungcheong: ["chungcheong", "daejeon", "gyeonggi", "seoul"],
  gyeongsang: ["gyeongsang", "busan", "daegu", "ulsan"],
  jeolla: ["jeolla", "gwangju"],
  national: [
    "seoul",
    "busan",
    "daegu",
    "incheon",
    "gwangju",
    "daejeon",
    "ulsan",
    "gyeonggi",
    "gangwon",
    "jeju",
    "chungcheong",
    "gyeongsang",
    "jeolla",
  ],
};

function detectSidoKeys(haystack: string): Set<SidoKey> {
  const found = new Set<SidoKey>();
  for (const { key, patterns } of SIDO_DETECTORS) {
    if (patterns.some((p) => p.test(haystack))) found.add(key);
  }
  return found;
}

export function aliasHaystackForeignSidoConflict(
  haystack: string,
  regionMain: string,
): boolean {
  const main = regionMain.trim();
  if (!main || main === "national") return false;

  const allowed = new Set(ALLOWED_SIDO_FOR_MAIN[main] ?? []);
  if (allowed.size === 0) return false;

  for (const detected of detectSidoKeys(haystack)) {
    if (!allowed.has(detected)) return true;
  }
  return false;
}

export function mediaMatchesBrowseRegionHaystackFallback(
  m: MediaItem,
  regionMain: string,
  regionSub: string,
  coverageFilter: RegionFilterSigunguCodes,
): boolean {
  const main = regionMain.trim();
  const subId = regionSub.trim();
  if (!subId) return false;

  // geo coverage codes가 있는 zone — tag·coverage만 (gangnam 184 유지)
  if (coverageFilter.kind === "codes" && coverageFilter.codes.size > 0) {
    return false;
  }

  const sub = getBrowseRegionSub(main, subId);
  if (!sub) return false;

  const aliases = haystackAliasesForSub(sub, subId);
  const hay = mediaRegionAliasHaystack(m);
  const nameLocHay = [m.name, m.nameEn, m.location, m.locationEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (aliasHaystackForeignSidoConflict(hay, main)) return false;

  const mediaMain = m.regionMain?.trim();
  const crossMain =
    Boolean(mediaMain) &&
    mediaMain !== main &&
    mediaMain !== "national" &&
    main !== "national";

  const hayTarget = crossMain ? nameLocHay : hay;
  const aliasHit = aliases.some((alias) =>
    aliasMatchesHaystackToken(alias, hayTarget),
  );

  if (crossMain) return aliasHit;

  if (
    mediaMain &&
    mediaMain !== main &&
    mediaMain !== "national" &&
    main !== "national"
  ) {
    return aliasHit;
  }

  return aliasHit;
}
