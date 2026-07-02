const STORAGE_KEY = "tkad_map_subway_overlay";

export function readSubwayOverlayEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "0") return false;
    return true;
  } catch {
    return true;
  }
}

export function writeSubwayOverlayEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* noop */
  }
}
