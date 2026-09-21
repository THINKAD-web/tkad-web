/** `/media/map` — 지도 이동 후 영역 재조회: 자동 vs 「이 지역에서 검색」 수동 */

const STORAGE_KEY = "tkad_map_area_search_mode_v1";

export type MapAreaSearchMode = "auto" | "manual";

export function readMapAreaSearchMode(): MapAreaSearchMode {
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "manual" ? "manual" : "auto";
  } catch {
    return "auto";
  }
}

export function writeMapAreaSearchMode(mode: MapAreaSearchMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
