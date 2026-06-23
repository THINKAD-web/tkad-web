/**
 * 서울 권역·수도권·지방 표준 코드 — 매체 `region`(광역) + `regionZone`(세부 권역).
 */

export type MediaRegionZoneId =
  | "gangnam"
  | "downtown"
  | "mapo"
  | "seongdong"
  | "gangseo"
  | "nowon"
  | "gwanak"
  | "gyeonggi"
  | "incheon"
  | "busan"
  | "daegu"
  | "gwangju"
  | "daejeon"
  | "other";

export type MediaRegionMacro =
  | "seoul"
  | "busan"
  | "jeju"
  | "national";

export type MediaRegionZoneDef = {
  id: MediaRegionZoneId;
  labelKo: string;
  labelEn: string;
  /** 행정구·군 전체명 */
  districts: string[];
  /** 구 약칭·상권명 (부분 일치) */
  aliases: string[];
};

/** 서울 권역 7개 + 수도권·지방 */
export const MEDIA_REGION_ZONES: MediaRegionZoneDef[] = [
  {
    id: "gangnam",
    labelKo: "강남권",
    labelEn: "Gangnam",
    districts: ["강남구", "서초구", "송파구", "강동구"],
    aliases: ["강남", "역삼", "삼성", "잠실", "송파", "서초", "코엑스", "테헤란"],
  },
  {
    id: "downtown",
    labelKo: "도심권",
    labelEn: "Downtown",
    districts: ["종로구", "중구", "용산구"],
    aliases: ["종로", "명동", "을지로", "동대문", "남대문", "시청", "광화문", "용산"],
  },
  {
    id: "mapo",
    labelKo: "마포권",
    labelEn: "Mapo",
    districts: ["마포구", "서대문구", "은평구"],
    aliases: ["마포", "홍대", "합정", "상암", "연남", "서대문", "은평"],
  },
  {
    id: "seongdong",
    labelKo: "성동권",
    labelEn: "Seongdong",
    districts: ["성동구", "광진구", "동대문구"],
    aliases: ["성수", "건대", "광진", "뚝섬", "왕십리"],
  },
  {
    id: "gangseo",
    labelKo: "강서권",
    labelEn: "Gangseo",
    districts: ["강서구", "양천구", "구로구", "영등포구"],
    aliases: ["강서", "양천", "구로", "영등포", "여의도", "목동", "마곡"],
  },
  {
    id: "nowon",
    labelKo: "노원권",
    labelEn: "Nowon",
    districts: ["노원구", "도봉구", "강북구", "성북구"],
    aliases: ["노원", "도봉", "강북", "성북", "미아", "수유"],
  },
  {
    id: "gwanak",
    labelKo: "관악권",
    labelEn: "Gwanak",
    districts: ["관악구", "동작구", "금천구"],
    aliases: ["관악", "동작", "금천", "사당", "신림"],
  },
  {
    id: "gyeonggi",
    labelKo: "경기",
    labelEn: "Gyeonggi",
    districts: [],
    aliases: ["경기", "수원", "성남", "분당", "판교", "용인", "고양", "일산", "부천", "안양"],
  },
  {
    id: "incheon",
    labelKo: "인천",
    labelEn: "Incheon",
    districts: [],
    aliases: ["인천", "송도", "부평", "연수"],
  },
  {
    id: "busan",
    labelKo: "부산",
    labelEn: "Busan",
    districts: [],
    aliases: ["부산", "해운대", "서면", "광안", "센텀", "남포"],
  },
  {
    id: "daegu",
    labelKo: "대구",
    labelEn: "Daegu",
    districts: [],
    aliases: ["대구"],
  },
  {
    id: "gwangju",
    labelKo: "광주",
    labelEn: "Gwangju",
    districts: [],
    aliases: ["광주"],
  },
  {
    id: "daejeon",
    labelKo: "대전",
    labelEn: "Daejeon",
    districts: [],
    aliases: ["대전", "세종"],
  },
  {
    id: "other",
    labelKo: "기타",
    labelEn: "Other",
    districts: [],
    aliases: ["울산", "창원", "청주", "전주", "춘천", "강원"],
  },
];

const ZONE_BY_ID = new Map(MEDIA_REGION_ZONES.map((z) => [z.id, z]));

const DISTRICT_TO_ZONE = new Map<string, MediaRegionZoneId>();
for (const zone of MEDIA_REGION_ZONES) {
  for (const d of zone.districts) {
    DISTRICT_TO_ZONE.set(d, zone.id);
    DISTRICT_TO_ZONE.set(d.replace(/구$/, ""), zone.id);
  }
}

function normBlob(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** 서울·수도권이 아닌 광역시·도 — 구명(중구 등) 오매칭 방지 */
function metroZoneFromBlob(blob: string): MediaRegionZoneId | null {
  if (/대구/.test(blob)) return "daegu";
  if (/부산/.test(blob)) return "busan";
  if (/광주/.test(blob)) return "gwangju";
  if (/대전|세종/.test(blob)) return "daejeon";
  if (/인천/.test(blob)) return "incheon";
  if (/경기|수원|성남|분당|판교|용인|고양|일산|부천|안양|하남/.test(blob)) {
    return "gyeonggi";
  }
  if (/울산|창원|청주|전주|춘천|강원/.test(blob)) return "other";
  return null;
}

function isSeoulDistrictContext(blob: string, city?: string): boolean {
  const c = (city ?? "").trim();
  if (c) {
    if (/서울/.test(c)) return true;
    if (/대구|부산|광주|대전|울산|제주|인천|경기|세종/.test(c)) return false;
  }
  if (/대구|부산|광주|대전|울산|제주|인천|경기|세종/.test(blob)) return false;
  return /서울/.test(blob) || !c;
}

/** 구 이름(또는 약칭) → 권역 코드 */
export function mapDistrictToRegionZone(
  district: string | null | undefined,
  opts?: { location?: string; city?: string },
): MediaRegionZoneId | null {
  const d = (district ?? "").trim();
  const blob = normBlob([opts?.city, opts?.location, district]);

  const metro = metroZoneFromBlob(blob);
  if (metro && !/서울/.test(blob)) {
    return metro;
  }

  if (d && isSeoulDistrictContext(blob, opts?.city)) {
    const direct = DISTRICT_TO_ZONE.get(d) ?? DISTRICT_TO_ZONE.get(`${d}구`);
    if (direct) return direct;
  }

  if (!blob) return null;

  for (const zone of MEDIA_REGION_ZONES) {
    for (const gu of zone.districts) {
      if (blob.includes(gu.toLowerCase()) || blob.includes(gu.replace(/구$/, "").toLowerCase())) {
        return zone.id;
      }
    }
    for (const alias of zone.aliases) {
      if (alias.length >= 2 && blob.includes(alias.toLowerCase())) {
        return zone.id;
      }
    }
  }

  return null;
}

/** 권역 → Prisma `region` 매크로 코드 */
export function regionMacroFromZone(zone: MediaRegionZoneId | null): MediaRegionMacro {
  if (!zone) return "national";
  if (
    zone === "gangnam" ||
    zone === "downtown" ||
    zone === "mapo" ||
    zone === "seongdong" ||
    zone === "gangseo" ||
    zone === "nowon" ||
    zone === "gwanak"
  ) {
    return "seoul";
  }
  if (zone === "busan") return "busan";
  if (zone === "gyeonggi" || zone === "incheon" || zone === "daegu" || zone === "gwangju" || zone === "daejeon" || zone === "other") {
    return "national";
  }
  return "national";
}

export function regionZoneLabel(
  zoneId: string | null | undefined,
  locale: "ko" | "en" = "ko",
): string | null {
  if (!zoneId) return null;
  const z = ZONE_BY_ID.get(zoneId as MediaRegionZoneId);
  if (!z) return zoneId;
  return locale === "ko" ? z.labelKo : z.labelEn;
}

export function isValidRegionZoneId(id: string): id is MediaRegionZoneId {
  return ZONE_BY_ID.has(id as MediaRegionZoneId);
}

export type NormalizedMediaLocation = {
  city: string;
  district: string;
  region: MediaRegionMacro;
  regionZone: MediaRegionZoneId | null;
};

/**
 * city / district / location / 기존 region 을 표준 권역·매크로로 정규화.
 */
export function normalizeMediaLocationFields(input: {
  city?: string | null;
  district?: string | null;
  location?: string | null;
  region?: string | null;
  regionZone?: string | null;
}): NormalizedMediaLocation {
  const location = (input.location ?? "").trim();
  let city = (input.city ?? "").trim();
  let district = (input.district ?? "").trim();

  if (!district && location) {
    const gu = location.match(/([가-힣]{2,8}(?:구|군))/);
    if (gu) district = gu[1]!;
  }
  if (!city && location) {
    const metro =
      location.match(
        /^(서울|부산|대구|인천|광주|대전|울산|세종|제주)(?:특별시|광역시|특별자치시|특별자치도)?/,
      )?.[1] ?? "";
    if (metro) city = metro;
    if (!city && /경기/.test(location)) city = "경기";
    if (!city && /제주|서귀포/.test(location)) city = "제주";
  }

  let regionZone: MediaRegionZoneId | null = null;
  if (input.regionZone && isValidRegionZoneId(input.regionZone)) {
    regionZone = input.regionZone;
  } else {
    regionZone = mapDistrictToRegionZone(district, { location, city });
  }

  let region: MediaRegionMacro = "national";
  const rawRegion = (input.region ?? "").trim().toLowerCase();
  if (rawRegion === "seoul" || rawRegion === "busan" || rawRegion === "jeju" || rawRegion === "national") {
    region = rawRegion;
  }
  if (regionZone) {
    region = regionMacroFromZone(regionZone);
  } else if (/제주|서귀포/.test(normBlob([city, district, location]))) {
    region = "jeju";
  } else if (
    /서울/.test(normBlob([city, location])) ||
    (isSeoulDistrictContext(normBlob([city, location, district]), city) &&
      mapDistrictToRegionZone(district, { location, city }))
  ) {
    region = "seoul";
  } else if (/부산/.test(normBlob([city, district, location]))) {
    region = "busan";
  }

  return { city, district, region, regionZone };
}
