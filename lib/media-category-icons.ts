/**
 * Design category icons — SSOT paths and resolvers for browse/filter/card fallbacks.
 */

export const MEDIA_CATEGORY_ICON_ASSETS = {
  subway: "/assets/category/icon-subway.png",
  onlineAd: "/assets/category/icon-online-ad.png",
  dooh: "/assets/category/icon-dooh.png",
  busWrap: "/assets/category/icon-bus-wrap.png",
  busShelter: "/assets/category/icon-bus-shelter.png",
  billboard: "/assets/category/icon-billboard.png",
} as const;

export type MediaCategoryIconKey = keyof typeof MEDIA_CATEGORY_ICON_ASSETS;

export const DESIGN_EMPTY_ASSETS = {
  planner: "/assets/empty/empty-planner.png",
  noResults: "/assets/empty/empty-no-results.png",
  notFound: "/assets/empty/empty-404.png",
} as const;

export const DESIGN_HERO_ASSETS = {
  loginWelcome: "/assets/hero/login-welcome.png",
} as const;

export function mediaCategoryIconSrc(
  key: MediaCategoryIconKey,
): string {
  return MEDIA_CATEGORY_ICON_ASSETS[key];
}

const BROWSE_SUB_ICON: Record<string, MediaCategoryIconKey> = {
  digital_signage: "dooh",
  led_screen: "dooh",
  billboard: "billboard",
  subway_station: "subway",
  subway_train: "subway",
  bus_exterior: "busWrap",
  bus_interior: "busWrap",
  vehicle_wrap: "busWrap",
  bus_shelter: "busShelter",
  digital_shelter: "busShelter",
};

const TYPE_FILTER_ICON: Record<string, MediaCategoryIconKey> = {
  subway: "subway",
  bus: "busWrap",
  billboard: "billboard",
  dooh: "dooh",
  bus_shelter: "busShelter",
};

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/** `/media` type filter chip value (`subway`, `bus`, …) */
export function resolveMediaCategoryIconFromTypeFilter(
  value: string,
): MediaCategoryIconKey | null {
  const v = normalizeToken(value);
  if (!v) return null;
  return TYPE_FILTER_ICON[v] ?? null;
}

/** Browse `mediaSubCategory` id (home coverage tiles, catalog facets). */
export function resolveMediaCategoryIconFromBrowseSub(
  subId: string,
): MediaCategoryIconKey | null {
  const id = normalizeToken(subId);
  if (!id) return null;
  return BROWSE_SUB_ICON[id] ?? null;
}

/** Catalog row / card when thumbnail is missing. */
export function resolveMediaCategoryIconFromMediaFields(input: {
  type?: string | null;
  mediaSubCategory?: string | null;
  catalogChannel?: string | null;
}): MediaCategoryIconKey | null {
  if (input.catalogChannel === "online") return "onlineAd";

  const sub = input.mediaSubCategory?.trim();
  if (sub) {
    const fromSub = resolveMediaCategoryIconFromBrowseSub(sub);
    if (fromSub) return fromSub;
  }

  const t = normalizeToken(input.type ?? "");
  if (!t) return null;
  if (t.includes("subway") || t.includes("지하철")) return "subway";
  if (t.includes("dooh") || t.includes("디지털")) return "dooh";
  if (t.includes("billboard") || t.includes("빌보드") || t.includes("전광")) {
    return "billboard";
  }
  if (t.includes("shelter") || t.includes("쉘터")) return "busShelter";
  if (t.includes("bus") || t.includes("버스") || t.includes("wrap")) {
    return "busWrap";
  }
  if (t === "online" || t.includes("online")) return "onlineAd";

  return TYPE_FILTER_ICON[t] ?? null;
}
