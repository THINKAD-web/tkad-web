/**
 * 매체 JSON(퀵 등록) → DB 반영 전 자동 보강:
 * region, type, sub_category 정규화, 태그 추출
 */

import { inferCatalogTypeFromMediaContent } from "@/lib/media-auto-categorize";

const MAX_AUTO_TAGS = 32;
const MAX_STATION_TAGS = 12;

/** 지역·상권명 (부분 일치, 매체명/주소/설명 공통 스캔) */
const AREA_NAME_KEYWORDS: string[] = [
  "강남",
  "역삼",
  "삼성",
  "청담",
  "압구정",
  "신사",
  "논현",
  "서초",
  "잠실",
  "송파",
  "홍대",
  "홍대입구",
  "합정",
  "마포",
  "상암",
  "디엠씨",
  "여의도",
  "영등포",
  "구로",
  "신촌",
  "이대",
  "명동",
  "을지로",
  "동대문",
  "성수",
  "뚝섬",
  "건대",
  "코엑스",
  "파르나스",
  "테헤란",
  "강남대로",
  "테크노",
  "판교",
  "분당",
  "수원",
  "인천",
  "부산",
  "서면",
  "해운대",
  "광안리",
  "센텀",
  "남포",
  "제주",
  "서귀포",
  "대구",
  "광주",
  "대전",
  "울산",
  "김포",
  "공항",
];

/** 매체 형식·수단 (검색 보조 태그) */
const MEDIA_FORM_KEYWORDS: string[] = [
  "지하철",
  "전광판",
  "LED",
  "미디어폴",
  "미디어타워",
  "스크린도어",
  "빌보드",
  "버스",
  "쉘터",
  "디지털",
  "사이니지",
];

/** 특징·규격 키워드 */
const FEATURE_KEYWORDS: string[] = [
  "대형",
  "초대형",
  "중형",
  "소형",
  "세로형",
  "가로형",
  "곡면형",
  "초광폭",
  "와이드",
  "3d",
  "3D",
  "입체",
  "투명",
  "이면",
  "양면",
  "전면",
  "초고해상도",
  "4k",
  "8k",
];

/** 설치·위치 맥락 */
const PLACEMENT_KEYWORDS: string[] = [
  "사거리",
  "대로변",
  "옥상",
  "외벽",
  "지하",
  "지상",
  "입구",
  "코너",
  "교차로",
  "고가",
  "인근",
  "역세권",
  "정문",
  "광장",
];

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** '강남역 ', '홍대입구역·' 등 역명 맥락 (역삼 등 오탐 최소화) */
function hasStationNameContext(s: string): boolean {
  return /[가-힣0-9]{1,8}역(?:\s|,|$|·|\/|\(|,)/.test(s) || /역\s*\(/.test(s);
}

function uniqTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const k = norm(t).toLowerCase();
    if (k.length < 2 || seen.has(k)) continue;
    seen.add(k);
    const display = norm(t);
    out.push(display === "3d" ? "3D" : display);
    if (out.length >= MAX_AUTO_TAGS) break;
  }
  return out;
}

/** 텍스트에서 「OO역」 패턴 추출 (강남역, 홍대입구역 등) */
function extractStationNameTags(text: string): string[] {
  const full = norm(text);
  const re = /[가-힣0-9]{2,12}역/g;
  const hits = full.match(re) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const k = h.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
    if (out.length >= MAX_STATION_TAGS) break;
  }
  return out;
}

function keywordHit(blobLower: string, kw: string): boolean {
  return blobLower.includes(kw.toLowerCase());
}

/** city / district 비어 있을 때 주소에서 추출 */
export function enrichCityDistrictFromAddress(
  cityIn: string,
  districtIn: string,
  fullAddress: string,
): { city: string; district: string } {
  let city = norm(cityIn);
  let district = norm(districtIn);
  const addr = norm(fullAddress);
  if (!city && addr) {
    const metro =
      addr.match(
        /^(서울|부산|대구|인천|광주|대전|울산|세종|제주)(?:특별시|광역시|특별자치시|특별자치도)?/,
      )?.[1] ?? "";
    if (metro) city = metro;
    if (!city && /경기/.test(addr)) city = "경기";
    if (!city && /제주|서귀포/.test(addr)) city = "제주";
  }
  if (!district && addr) {
    const gu = addr.match(/([가-힣]{2,8}(?:구|군))/);
    if (gu) district = gu[1];
  }
  return { city, district };
}

/**
 * Prisma `region` 코드: seoul | busan | jeju | national
 */
export function deriveRegionFromAddress(
  city: string,
  district: string,
  fullAddress: string,
): string {
  const blob = norm(`${city} ${district} ${fullAddress}`).toLowerCase();
  if (/제주|서귀포/.test(blob)) return "jeju";

  // 시명이 빠져 있어도 부산 상권·행정구 힌트
  if (
    /부산|해운대|광안리|서면|센텀|남포|금정구|연제구|수영구|부산진구|해운대구|동래구|사하구|북구|사상구/.test(
      blob,
    )
  ) {
    return "busan";
  }

  if (/서울/.test(blob)) return "seoul";

  // 서울 특별시 표기 없이 구·대표 상권만 있는 경우
  if (
    /강남구|서초구|마포구|송파구|용산구|영등포구|종로구|성동구|광진구|동대문구|성북구|은평구|노원구|강서구|양천구|구로구|금천구|관악구|서대문구|강동구|도봉구|강북구/.test(
      blob,
    ) ||
    /\b(gangnam|hongdae|mapo|yeouido|myeongdong)\b/.test(blob)
  ) {
    return "seoul";
  }

  if (
    /대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남/.test(
      blob,
    )
  ) {
    return "national";
  }
  return "national";
}

/**
 * `sub_category` 문자열만 있을 때 유형 추론 (전체 텍스트 기반은 `inferCatalogTypeFromMediaContent`)
 */
export function deriveTypeFromSubCategory(subCategory: string): string {
  return inferCatalogTypeFromMediaContent({
    subCategory,
    name: "",
    description: "",
    location: "",
    tags: [],
  });
}

/**
 * JSON `sub_category` 비었을 때 매체명·설명에서 1차 추정
 */
export function inferSubCategoryFromText(name: string, description: string): string {
  const blob = norm(`${name} ${description}`).toLowerCase();
  if (!blob) return "디지털 시그니지";

  if (
    /빌보드|외벽|건물\s*랩핑|현수막|billboard|roof/.test(blob)
  ) {
    return "옥외 빌보드";
  }
  if (
    /지하철|스크린\s*도어|멀티비전|지하\s*통로|환승|전철|subway|metro/.test(
      blob,
    ) ||
    hasStationNameContext(blob)
  ) {
    return "지하철 매체";
  }
  if (/버스|쉘터|정류장|bus|shelter/.test(blob)) {
    return "버스·쉘터";
  }
  if (/미디어\s*폴|mediapole|media\s*pole|g-light|미디어폴/.test(blob)) {
    return "미디어폴";
  }
  if (/미디어\s*타워|media\s*tower/.test(blob)) {
    return "미디어타워";
  }
  if (/스크린\s*도어/.test(blob)) {
    return "스크린도어";
  }
  if (/led|전광판|디지털|digital|사이니지|signage|lcd/.test(blob)) {
    return "디지털 전광판";
  }
  return "디지털 시그니지";
}

/**
 * 세부 유형 표기 정리 (동의어·영문 → 한글 우선 표기)
 */
export function normalizeSubCategory(raw: string): string {
  const s = norm(raw);
  if (!s) return "";

  const lower = s.toLowerCase();

  const rules: [RegExp, string][] = [
    [/^디지털$/i, "디지털 전광판"],
    [/^(digital|dooh|led)\s*$/i, "디지털 전광판"],
    [/^(billboard|ooh)\s*$/i, "옥외 빌보드"],
    [/^(subway|metro)\s*$/i, "지하철 매체"],
    [/^(bus|shelter)\s*$/i, "버스·쉘터"],
    [/미디어\s*폴|media\s*pole|mediapole/i, "미디어폴"],
    [/미디어\s*타워|media\s*tower/i, "미디어타워"],
    [/스크린\s*도어|screen\s*door/i, "스크린도어"],
    [/멀티\s*비전|multivision/i, "멀티비전"],
    [/디지털\s*전광판|digital\s*board/i, "디지털 전광판"],
    [/옥외\s*빌보드|outdoor/i, "옥외 빌보드"],
  ];

  for (const [re, out] of rules) {
    if (re.test(s) || re.test(lower)) return out;
  }

  return s;
}

function splitLooseCsv(s: string): string[] {
  return s
    .split(/[,，、·/|]/g)
    .map((x) => norm(x))
    .filter((x) => x.length >= 2 && x.length <= 32);
}

/**
 * 매체명·주소·설명·주변 필드에서 태그 후보 추출 (JSON tags와 병합)
 */
export function extractAutoTags(params: {
  name: string;
  location: string;
  description: string;
  nearbyStations: string;
  nearbyLandmarks: string;
  nearbyFacilities: string;
  city: string;
  district: string;
  subCategory: string;
}): string[] {
  const fullText = norm(
    `${params.name} ${params.location} ${params.description} ${params.nearbyStations} ${params.nearbyLandmarks} ${params.nearbyFacilities}`,
  );
  const blob = fullText.toLowerCase();

  const found: string[] = [];

  for (const kw of AREA_NAME_KEYWORDS) {
    if (keywordHit(blob, kw)) found.push(kw);
  }
  for (const kw of MEDIA_FORM_KEYWORDS) {
    if (keywordHit(blob, kw)) found.push(kw);
  }
  for (const kw of FEATURE_KEYWORDS) {
    if (keywordHit(blob, kw)) found.push(kw);
  }
  for (const kw of PLACEMENT_KEYWORDS) {
    if (keywordHit(blob, kw)) found.push(kw);
  }

  found.push(...extractStationNameTags(fullText));

  for (const part of splitLooseCsv(params.nearbyStations)) {
    if (part.length >= 2) found.push(part);
  }
  for (const part of splitLooseCsv(params.nearbyLandmarks)) {
    if (part.length >= 2) found.push(part);
  }
  for (const part of splitLooseCsv(params.nearbyFacilities)) {
    if (part.length >= 2 && part.length <= 20) found.push(part);
  }

  if (params.city) found.push(params.city);
  if (params.district) found.push(params.district);

  const sc = norm(params.subCategory);
  if (sc.length >= 2 && sc.length <= 24) {
    found.push(sc);
  }

  return uniqTags(found);
}

export function mergeManualAndAutoTags(
  manual: string[],
  auto: string[],
): string[] {
  const manualN = manual.map(norm).filter(Boolean);
  return uniqTags([...manualN, ...auto]);
}
