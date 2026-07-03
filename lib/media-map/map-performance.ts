/** Performance marks for `/media/map` usable-time regression checks (4× CPU throttle). */

export const MAP_PERF_MARK_INIT = "tkad-map-init";
export const MAP_PERF_MARK_USABLE = "tkad-map-usable";
export const MAP_PERF_MEASURE_USABLE = "tkad-map-usable-duration";

export function markMapPageInit(): void {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(MAP_PERF_MARK_INIT);
  } catch {
    /* noop */
  }
}

export function markMapPageUsable(): void {
  if (typeof performance === "undefined") return;
  try {
    if (performance.getEntriesByName(MAP_PERF_MARK_USABLE).length > 0) return;
    performance.mark(MAP_PERF_MARK_USABLE);
    performance.measure(
      MAP_PERF_MEASURE_USABLE,
      MAP_PERF_MARK_INIT,
      MAP_PERF_MARK_USABLE,
    );
  } catch {
    /* init mark may be missing in dev HMR */
  }
}
