/**
 * Display mode (표출/설치 방식) — `Media.type` / `PlannerCategory` user-facing labels.
 *
 * Distinct from `CatalogChannel` (offline vs online) and browse main/sub taxonomy.
 */

export type DisplayMode = "dooh" | "static" | "mobile";

export const DISPLAY_MODE_LABELS: Record<
  DisplayMode,
  { ko: string; en: string }
> = {
  dooh: { ko: "디지털 표출", en: "Digital screen" },
  static: { ko: "인쇄물", en: "Print / static" },
  mobile: { ko: "이동형", en: "Mobile" },
};

export function displayModeLabel(
  mode: string | null | undefined,
  locale: "ko" | "en" = "ko",
): string {
  const key = mode?.trim().toLowerCase();
  if (key === "digital") return DISPLAY_MODE_LABELS.dooh[locale];
  const row = key && key in DISPLAY_MODE_LABELS
    ? DISPLAY_MODE_LABELS[key as DisplayMode]
    : null;
  return row?.[locale] ?? mode ?? "";
}
