/** Nationwide metro line colors — capital re-exports + provincial cities */

export type MetroCityId =
  | "capital"
  | "busan"
  | "daegu"
  | "gwangju"
  | "daejeon";

export type MetroLineDef = {
  id: string;
  nameKo: string;
  nameEn: string;
  color: string;
};

export type SeoulMetroLineId =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "bundang"
  | "shinbundang"
  | "gyeongui-jungang"
  | "arex"
  | "gtx-a"
  | "gyeonggang"
  | "gimpo-gold"
  | "incheon1"
  | "incheon2"
  | "everline"
  | "uijeongbu"
  | "gyeongchun"
  | "seohae"
  | "silim";

export type SeoulMetroLineDef = MetroLineDef & { id: SeoulMetroLineId };

export const SEOUL_METRO_LINES: readonly SeoulMetroLineDef[] = [
  { id: "1", nameKo: "1호선", nameEn: "Line 1", color: "#0052A4" },
  { id: "2", nameKo: "2호선", nameEn: "Line 2", color: "#00A84D" },
  { id: "3", nameKo: "3호선", nameEn: "Line 3", color: "#EF7C1C" },
  { id: "4", nameKo: "4호선", nameEn: "Line 4", color: "#00A4E3" },
  { id: "5", nameKo: "5호선", nameEn: "Line 5", color: "#996CAC" },
  { id: "6", nameKo: "6호선", nameEn: "Line 6", color: "#CD7C2F" },
  { id: "7", nameKo: "7호선", nameEn: "Line 7", color: "#747F00" },
  { id: "8", nameKo: "8호선", nameEn: "Line 8", color: "#E6186C" },
  { id: "9", nameKo: "9호선", nameEn: "Line 9", color: "#BDB092" },
  { id: "bundang", nameKo: "분당선", nameEn: "Bundang Line", color: "#F5A200" },
  { id: "shinbundang", nameKo: "신분당선", nameEn: "Shinbundang Line", color: "#D31143" },
  { id: "gyeongui-jungang", nameKo: "경의중앙선", nameEn: "Gyeongui–Jungang Line", color: "#77C4A3" },
  { id: "arex", nameKo: "공항철도", nameEn: "AREX", color: "#0090D2" },
  { id: "gtx-a", nameKo: "GTX-A", nameEn: "GTX-A", color: "#9A6292" },
  { id: "gyeonggang", nameKo: "경강선", nameEn: "Gyeonggang Line", color: "#0054A6" },
  { id: "gimpo-gold", nameKo: "김포골드라인", nameEn: "Gimpo Gold Line", color: "#A17800" },
  { id: "incheon1", nameKo: "인천1호선", nameEn: "Incheon Line 1", color: "#759BBE" },
  { id: "incheon2", nameKo: "인천2호선", nameEn: "Incheon Line 2", color: "#F5A200" },
  { id: "everline", nameKo: "용인경전철", nameEn: "Everline", color: "#56AB2D" },
  { id: "uijeongbu", nameKo: "의정부경전철", nameEn: "Uijeongbu LRT", color: "#FDA600" },
  { id: "gyeongchun", nameKo: "경춘선", nameEn: "Gyeongchun Line", color: "#0C8E72" },
  { id: "seohae", nameKo: "서해선", nameEn: "Seohae Line", color: "#81A1D2" },
  { id: "silim", nameKo: "신림선", nameEn: "Sillim Line", color: "#4EA346" },
] as const;

export const SEOUL_METRO_MVP_LINE_IDS: SeoulMetroLineId[] = SEOUL_METRO_LINES.map(
  (l) => l.id,
);

export const SEOUL_METRO_LINE_BY_ID = Object.fromEntries(
  SEOUL_METRO_LINES.map((l) => [l.id, l]),
) as Record<SeoulMetroLineId, SeoulMetroLineDef>;

const PROVINCIAL_LINES: Record<
  Exclude<MetroCityId, "capital">,
  readonly MetroLineDef[]
> = {
  busan: [
    { id: "1", nameKo: "1호선", nameEn: "Line 1", color: "#F06A00" },
    { id: "2", nameKo: "2호선", nameEn: "Line 2", color: "#81BF48" },
    { id: "3", nameKo: "3호선", nameEn: "Line 3", color: "#BB8C00" },
    { id: "4", nameKo: "4호선", nameEn: "Line 4", color: "#217DCB" },
    { id: "donghae", nameKo: "동해선", nameEn: "Donghae Line", color: "#8FC31F" },
  ],
  daegu: [
    { id: "1", nameKo: "1호선", nameEn: "Line 1", color: "#D93F5C" },
    { id: "2", nameKo: "2호선", nameEn: "Line 2", color: "#00AA80" },
    { id: "3", nameKo: "3호선", nameEn: "Line 3", color: "#FFB850" },
  ],
  gwangju: [{ id: "1", nameKo: "1호선", nameEn: "Line 1", color: "#009944" }],
  daejeon: [{ id: "1", nameKo: "1호선", nameEn: "Line 1", color: "#007448" }],
};

export const METRO_CITY_LINES: Record<MetroCityId, readonly MetroLineDef[]> = {
  capital: SEOUL_METRO_LINES,
  ...PROVINCIAL_LINES,
};

export function metroLineDef(
  cityId: MetroCityId,
  lineId: string,
): MetroLineDef | undefined {
  return METRO_CITY_LINES[cityId]?.find((l) => l.id === lineId);
}

export const METRO_CITY_META: Record<
  MetroCityId,
  { nameKo: string; bbox: { south: number; west: number; north: number; east: number } }
> = {
  capital: {
    nameKo: "수도권",
    bbox: { south: 36.9, west: 126.4, north: 37.85, east: 127.45 },
  },
  busan: {
    nameKo: "부산",
    bbox: { south: 35.0, west: 128.75, north: 35.4, east: 129.25 },
  },
  daegu: {
    nameKo: "대구",
    bbox: { south: 35.72, west: 128.45, north: 36.02, east: 128.78 },
  },
  gwangju: {
    nameKo: "광주",
    bbox: { south: 35.05, west: 126.72, north: 35.24, east: 126.95 },
  },
  daejeon: {
    nameKo: "대전",
    bbox: { south: 36.22, west: 127.32, north: 36.48, east: 127.55 },
  },
};
