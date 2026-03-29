/** 카카오 장소명(예: "강남역 2호선") → 공공데이터 `stnNm` 검색용 짧은 역명 */
export function kakaoPlaceToMetroStnNm(placeName: string): string {
  let s = placeName.replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\d+호선.*$/u, "").trim();
  s = s.replace(/\([^)]*\)/g, "").trim();
  s = s.replace(/지하철\s*/g, "").trim();
  if (s.endsWith("역")) s = s.slice(0, -1).trim();
  else s = s.replace(/역(\s|$)/, " ").trim();
  return s.trim() || placeName.trim();
}
