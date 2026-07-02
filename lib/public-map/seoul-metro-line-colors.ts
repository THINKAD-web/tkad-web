/** 수도권 지하철 호선 공식 색 — 오버레이 렌더·빌드 스크립트 공용 */

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

export type SeoulMetroLineDef = {
  id: SeoulMetroLineId;
  nameKo: string;
  nameEn: string;
  color: string;
};

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
  {
    id: "shinbundang",
    nameKo: "신분당선",
    nameEn: "Shinbundang Line",
    color: "#D31143",
  },
  {
    id: "gyeongui-jungang",
    nameKo: "경의중앙선",
    nameEn: "Gyeongui–Jungang Line",
    color: "#77C4A3",
  },
  { id: "arex", nameKo: "공항철도", nameEn: "AREX", color: "#0090D2" },
  { id: "gtx-a", nameKo: "GTX-A", nameEn: "GTX-A", color: "#9A6292" },
  { id: "gyeonggang", nameKo: "경강선", nameEn: "Gyeonggang Line", color: "#0054A6" },
  {
    id: "gimpo-gold",
    nameKo: "김포골드라인",
    nameEn: "Gimpo Gold Line",
    color: "#A17800",
  },
  { id: "incheon1", nameKo: "인천1호선", nameEn: "Incheon Line 1", color: "#759BBE" },
  { id: "incheon2", nameKo: "인천2호선", nameEn: "Incheon Line 2", color: "#F5A200" },
  {
    id: "everline",
    nameKo: "용인경전철",
    nameEn: "Everline",
    color: "#56AB2D",
  },
  {
    id: "uijeongbu",
    nameKo: "의정부경전철",
    nameEn: "Uijeongbu LRT",
    color: "#FDA600",
  },
  { id: "gyeongchun", nameKo: "경춘선", nameEn: "Gyeongchun Line", color: "#0C8E72" },
  { id: "seohae", nameKo: "서해선", nameEn: "Seohae Line", color: "#81A1D2" },
  { id: "silim", nameKo: "신림선", nameEn: "Sillim Line", color: "#4EA346" },
] as const;

export const SEOUL_METRO_LINE_BY_ID: Record<
  SeoulMetroLineId,
  SeoulMetroLineDef
> = Object.fromEntries(
  SEOUL_METRO_LINES.map((line) => [line.id, line]),
) as Record<SeoulMetroLineId, SeoulMetroLineDef>;

/** 수도권 오버레이에 포함할 lineId (빌드·렌더 공용) */
export const SEOUL_METRO_MVP_LINE_IDS: readonly SeoulMetroLineId[] =
  SEOUL_METRO_LINES.map((l) => l.id);
