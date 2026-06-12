export type ParsedNetworkLocationRow = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number;
  regionMain: string | null;
  regionSub: string | null;
};

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * CSV: 지점명,주소,위도,경도,대수[,시도,세부지역]
 * (헤더 행 선택, 열 이름 자동 인식. 헤더 없으면 위 컬럼 순서로 해석)
 */
export function parseNetworkLocationsCsv(text: string): ParsedNetworkLocationRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstParts = splitCsvLine(lines[0]);
  const firstJoined = firstParts.map(normHeader).join("|");

  const looksLikeHeader =
    /name|지점|위치|title|매체명/i.test(lines[0]) &&
    (firstJoined.includes("address") ||
      firstJoined.includes("주소") ||
      firstJoined.includes("lat") ||
      firstJoined.includes("위도") ||
      firstJoined.includes("대수"));

  let start = 0;
  let colName = 0;
  let colAddress = 1;
  let colLat = 2;
  let colLng = 3;
  let colUnits = 4;
  let colRegionMain = -1;
  let colRegionSub = -1;

  if (looksLikeHeader) {
    start = 1;
    const headers = firstParts.map(normHeader);
    const idx = (candidates: string[]) => {
      for (const c of candidates) {
        const i = headers.findIndex((h) => h === c || h.includes(c));
        if (i >= 0) return i;
      }
      return -1;
    };
    const inName = idx(["name", "지점", "위치", "title", "매체명"]);
    const inAddr = idx(["address", "주소", "addr"]);
    const inLat = idx(["latitude", "lat", "위도", "y"]);
    const inLng = idx(["longitude", "lng", "lon", "경도", "x"]);
    const inUnits = idx(["대수", "units", "unitcount", "수량", "qty"]);
    const inRegMain = idx(["시도", "regionmain", "광역", "시/도"]);
    const inRegSub = idx(["세부지역", "regionsub", "구군", "시군구", "세부"]);
    if (inName >= 0) colName = inName;
    if (inAddr >= 0) colAddress = inAddr;
    if (inLat >= 0) colLat = inLat;
    if (inLng >= 0) colLng = inLng;
    colUnits = inUnits; // -1 이면 대수 컬럼 없음 → 기본 1
    colRegionMain = inRegMain;
    colRegionSub = inRegSub;
  }

  const out: ParsedNetworkLocationRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const name = (parts[colName] ?? "").trim();
    if (!name) continue;
    const address = (parts[colAddress] ?? "").trim() || null;
    const latRaw = parts[colLat];
    const lngRaw = parts[colLng];
    const lat = latRaw != null && latRaw !== "" ? Number(latRaw) : NaN;
    const lng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : NaN;
    const unitsRaw = colUnits >= 0 ? parts[colUnits] : undefined;
    const units =
      unitsRaw != null && unitsRaw !== ""
        ? Math.max(1, Math.round(Number(unitsRaw.replace(/[^0-9.]/g, ""))) || 1)
        : 1;
    const regionMain =
      colRegionMain >= 0 ? (parts[colRegionMain] ?? "").trim() || null : null;
    const regionSub =
      colRegionSub >= 0 ? (parts[colRegionSub] ?? "").trim() || null : null;
    out.push({
      name,
      address,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      unitCount: units,
      regionMain,
      regionSub,
    });
  }
  return out;
}

/** 어드민 CSV 템플릿 (UTF-8 BOM + 샘플) */
export function networkLocationsCsvTemplate(): string {
  const rows = [
    "지점명,주소,위도,경도,대수,시도,세부지역",
    "강남파이낸스센터,서울 강남구 테헤란로 152,37.5009,127.0366,12,서울,강남구",
    "해운대센텀시티,부산 해운대구 센텀중앙로 79,35.1690,129.1300,8,부산,해운대구",
  ];
  return "﻿" + rows.join("\r\n") + "\r\n";
}
