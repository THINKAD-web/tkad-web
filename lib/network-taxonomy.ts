import {
  browseCategoryLabel,
  inferBrowseCategoryFromMedia,
  isValidBrowseSub,
} from "@/lib/media-browse-categories";
import { browseRegionLabel } from "@/lib/media-browse-regions";
import { targetLabel } from "@/lib/media-categories";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
  isNetworkVenueCode,
  networkVenueTag,
  parseNetworkVenueFromTags,
  resolveNetworkCatalogType,
  resolveNetworkVenueCode,
  type NetworkCatalogType,
  type NetworkTypeCode,
} from "@/lib/media-network-types";
import { resolveBrowseRegionIds } from "@/lib/network-location-enrich";

export type NetworkTaxonomyFormState = {
  catalogType: NetworkCatalogType;
  venueCode: string;
  browseMain: string;
  browseSub: string;
  regionMain: string;
  regionSub: string;
  targetSlugs: string[];
};

export type NetworkTaxonomyRow = {
  type: string;
  tags?: string[] | null;
  venueType?: string | null;
  mediaMainCategory?: string | null;
  mediaSubCategory?: string | null;
  regionMain?: string | null;
  regionSub?: string | null;
  targetCategory?: string[] | null;
  name?: string;
  description?: string | null;
  regions?: string[] | null;
  locations?: Array<{
    regionMain?: string | null;
    regionSub?: string | null;
    address?: string | null;
    fullAddress?: string | null;
  }> | null;
};

export type NetworkTaxonomyLabels = {
  catalogType: NetworkCatalogType;
  venueCode: string | null;
  venueLabel: string | null;
  browseMain: string | null;
  browseSub: string | null;
  browseLabel: string | null;
  regionLabel: string | null;
  targetSlugs: string[];
  targetLabels: string[];
  warnings: string[];
};

const VENUE_TO_BROWSE: Partial<
  Record<NetworkTypeCode, { main: string; sub: string }>
> = {
  bus_shelter: { main: "shelter", sub: "bus_shelter" },
  apartment: { main: "building", sub: "apartment" },
  subway_pillar: { main: "transit", sub: "subway_station" },
  subway_station: { main: "transit", sub: "subway_station" },
  convenience_store: { main: "network", sub: "convenience_network" },
  golf_course: { main: "etc", sub: "other" },
  highway_rest: { main: "transit", sub: "ktx_terminal" },
  campus_kiosk: { main: "network", sub: "campus_network" },
  elevator: { main: "network", sub: "elevator_network" },
  shopping_mall: { main: "shopping", sub: "mall" },
  bookstore: { main: "network", sub: "franchise_network" },
  office: { main: "building", sub: "office" },
  hospital: { main: "network", sub: "hospital_network" },
};

const TARGET_TAG_RE = /^target:(.+)$/i;

function browseFieldsFromRow(m: {
  mediaMainCategory?: string | null;
  mediaSubCategory?: string | null;
  regionMain?: string | null;
  regionSub?: string | null;
}): {
  browseMain: string;
  browseSub: string;
  regionMain: string;
  regionSub: string;
} {
  return {
    browseMain: m.mediaMainCategory?.trim() ?? "",
    browseSub: m.mediaSubCategory?.trim() ?? "",
    regionMain: m.regionMain?.trim() ?? "",
    regionSub: m.regionSub?.trim() ?? "",
  };
}

function validateBrowseFields(browseMain: string, browseSub: string): string | null {
  if (browseSub && browseMain && !isValidBrowseSub(browseMain, browseSub)) {
    return "Browse 소분류가 대분류와 맞지 않습니다.";
  }
  return null;
}

export function parseTargetSlugsFromTags(
  tags: readonly string[] | null | undefined,
): string[] {
  if (!tags?.length) return [];
  const out: string[] = [];
  for (const t of tags) {
    const m = TARGET_TAG_RE.exec(t.trim());
    if (m?.[1]?.trim()) out.push(m[1].trim());
  }
  return [...new Set(out)];
}

export function suggestBrowseFromVenue(
  venueCode: string,
): { main: string; sub: string } | null {
  const v = venueCode.trim().toLowerCase();
  if (!v || !isNetworkVenueCode(v)) return null;
  return VENUE_TO_BROWSE[v as NetworkTypeCode] ?? null;
}

export function resolveNetworkVenueCodeFromRow(
  row: Pick<NetworkTaxonomyRow, "type" | "tags" | "venueType">,
): string | null {
  const fromCol = row.venueType?.trim();
  if (fromCol && isNetworkVenueCode(fromCol)) return fromCol;
  return resolveNetworkVenueCode(row.type, row.tags);
}

export function resolveNetworkCatalogTypeFromRow(
  row: Pick<NetworkTaxonomyRow, "type" | "tags" | "venueType">,
): NetworkCatalogType {
  const t = row.type.trim().toLowerCase();
  if (t === "digital" || t === "static" || t === "mobile") return t;
  const venue = resolveNetworkVenueCodeFromRow(row);
  if (venue) return resolveNetworkCatalogType(venue);
  return resolveNetworkCatalogType(row.type);
}

function resolveBrowseRegionFromRow(row: NetworkTaxonomyRow): {
  regionMain: string;
  regionSub: string;
} {
  const direct = browseFieldsFromRow({
    regionMain: row.regionMain,
    regionSub: row.regionSub,
  });
  if (direct.regionMain) {
    return { regionMain: direct.regionMain, regionSub: direct.regionSub };
  }

  for (const loc of row.locations ?? []) {
    const resolved = resolveBrowseRegionIds({
      regionMain: loc.regionMain,
      regionSub: loc.regionSub,
      address: loc.fullAddress ?? loc.address,
    });
    if (resolved.regionMain) {
      return {
        regionMain: resolved.regionMain,
        regionSub: resolved.regionSub ?? "",
      };
    }
  }

  const firstRegion = row.regions?.[0]?.trim();
  if (firstRegion) {
    const resolved = resolveBrowseRegionIds({ address: firstRegion });
    return {
      regionMain: resolved.regionMain ?? "",
      regionSub: resolved.regionSub ?? "",
    };
  }

  return { regionMain: "", regionSub: "" };
}

export function inferNetworkBrowseDefaults(input: {
  catalogType: string;
  venueCode?: string | null;
  name?: string;
  description?: string | null;
  tags?: string[] | null;
}): { main: string; sub: string } {
  const venue = input.venueCode?.trim() || null;
  if (venue) {
    const suggested = suggestBrowseFromVenue(venue);
    if (suggested) return suggested;
  }
  return inferBrowseCategoryFromMedia({
    type: input.catalogType,
    subCategory: venue,
    name: input.name,
    description: input.description,
    tags: input.tags ?? [],
  });
}

export function networkTaxonomyFromRow(
  row: NetworkTaxonomyRow,
): NetworkTaxonomyFormState {
  const venueCode = resolveNetworkVenueCodeFromRow(row) ?? "";
  const catalogType = resolveNetworkCatalogTypeFromRow(row);
  const browse = browseFieldsFromRow({
    mediaMainCategory: row.mediaMainCategory,
    mediaSubCategory: row.mediaSubCategory,
    regionMain: row.regionMain,
    regionSub: row.regionSub,
  });

  let browseMain = browse.browseMain;
  let browseSub = browse.browseSub;
  if (!browseMain) {
    const inferred = inferNetworkBrowseDefaults({
      catalogType,
      venueCode: venueCode || null,
      name: row.name,
      description: row.description,
      tags: row.tags,
    });
    browseMain = inferred.main;
    browseSub = browseSub || inferred.sub;
  }

  const region = resolveBrowseRegionFromRow(row);
  const fromCol = row.targetCategory ?? [];
  const targetSlugs =
    fromCol.length > 0 ? [...fromCol] : parseTargetSlugsFromTags(row.tags);

  return {
    catalogType,
    venueCode,
    browseMain,
    browseSub,
    regionMain: region.regionMain,
    regionSub: region.regionSub,
    targetSlugs,
  };
}

/** Merge venue tag into tags; strip other venue:* and target:* (columns are source of truth). */
export function syncNetworkTagsWithTaxonomy(
  existingTags: string[],
  venueCode: string,
  targetSlugs: string[],
): string[] {
  const kept = existingTags.filter((t) => {
    const s = t.trim();
    if (!s) return false;
    if (s.startsWith("venue:")) return false;
    if (TARGET_TAG_RE.test(s)) return false;
    return true;
  });
  const out = new Set(kept);
  const venue = venueCode.trim();
  if (venue && isNetworkVenueCode(venue)) {
    out.add(networkVenueTag(venue));
  }
  for (const slug of targetSlugs) {
    const s = slug.trim();
    if (s) out.add(`target:${s}`);
  }
  return [...out];
}

export function networkTaxonomyToPatch(
  state: NetworkTaxonomyFormState,
  existingTags: string[] = [],
): {
  type: string;
  venueType: string | null;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  regionMain: string | null;
  regionSub: string | null;
  targetCategory: string[];
  tags: string[];
} {
  const err = validateBrowseFields(state.browseMain, state.browseSub);
  if (err) throw new Error(err);

  const venue = state.venueCode.trim();
  const venueType =
    venue && isNetworkVenueCode(venue) ? venue : null;

  return {
    type: state.catalogType,
    venueType,
    mediaMainCategory: state.browseMain.trim() || null,
    mediaSubCategory: state.browseSub.trim() || null,
    regionMain: state.regionMain.trim() || null,
    regionSub: state.regionSub.trim() || null,
    targetCategory: [...state.targetSlugs],
    tags: syncNetworkTagsWithTaxonomy(
      existingTags,
      venueType ?? "",
      state.targetSlugs,
    ),
  };
}

export function resolveNetworkBrowseForPublic(
  row: NetworkTaxonomyRow,
): { mediaMainCategory: string; mediaSubCategory: string | undefined } {
  const mainDb = row.mediaMainCategory?.trim();
  const subDb = row.mediaSubCategory?.trim();
  if (mainDb) {
    return {
      mediaMainCategory: mainDb,
      mediaSubCategory: subDb || undefined,
    };
  }
  const catalogType = resolveNetworkCatalogTypeFromRow(row);
  const venue = resolveNetworkVenueCodeFromRow(row);
  const inferred = inferNetworkBrowseDefaults({
    catalogType,
    venueCode: venue,
    name: row.name,
    description: row.description,
    tags: row.tags,
  });
  return {
    mediaMainCategory: inferred.main,
    mediaSubCategory: inferred.sub || undefined,
  };
}

export function resolveNetworkTargetForPublic(
  row: Pick<NetworkTaxonomyRow, "targetCategory" | "tags">,
): string[] | undefined {
  const fromCol = row.targetCategory ?? [];
  if (fromCol.length > 0) return [...fromCol];
  const fromTags = parseTargetSlugsFromTags(row.tags);
  return fromTags.length > 0 ? fromTags : undefined;
}

export function resolveNetworkTaxonomyLabels(
  row: NetworkTaxonomyRow,
  locale = "ko",
): NetworkTaxonomyLabels {
  const catalogType = resolveNetworkCatalogTypeFromRow(row);
  const venueCode = resolveNetworkVenueCodeFromRow(row);
  const browse = resolveNetworkBrowseForPublic(row);
  const targetSlugs = resolveNetworkTargetForPublic(row) ?? [];

  const warnings: string[] = [];
  if (!row.mediaMainCategory?.trim()) warnings.push("browse");
  if (!venueCode) warnings.push("venue");
  if (targetSlugs.length === 0) warnings.push("target");

  const browseLabel =
    browse.mediaMainCategory && browse.mediaSubCategory
      ? `${browseCategoryLabel(browse.mediaMainCategory, locale, "main")} › ${browseCategoryLabel(browse.mediaSubCategory, locale, "sub", browse.mediaMainCategory)}`
      : browse.mediaMainCategory
        ? browseCategoryLabel(browse.mediaMainCategory, locale, "main")
        : null;

  const regionMain =
    row.regionMain?.trim() ||
    resolveBrowseRegionFromRow(row).regionMain ||
    "";
  const regionSub =
    row.regionSub?.trim() ||
    resolveBrowseRegionFromRow(row).regionSub ||
    "";
  const regionParts: string[] = [];
  if (regionMain) {
    regionParts.push(browseRegionLabel(regionMain, locale, "main"));
  }
  if (regionSub) {
    regionParts.push(
      browseRegionLabel(regionSub, locale, "sub", regionMain || undefined),
    );
  }

  return {
    catalogType,
    venueCode,
    venueLabel: venueCode
      ? (NETWORK_TYPE_LABELS[venueCode]?.[
          locale.startsWith("ko") ? "ko" : "en"
        ] ?? venueCode)
      : null,
    browseMain: browse.mediaMainCategory || null,
    browseSub: browse.mediaSubCategory ?? null,
    browseLabel,
    regionLabel: regionParts.length > 0 ? regionParts.join(" · ") : null,
    targetSlugs,
    targetLabels: targetSlugs.map((s) => targetLabel(s, locale)),
    warnings,
  };
}

export const NETWORK_VENUE_OPTIONS = NETWORK_TYPE_CODES;

/** Create / quick-add: derive taxonomy columns from catalog + venue + locations. */
export function networkTaxonomyDefaultsForCreate(input: {
  catalogType: string;
  venueCode?: string | null;
  name: string;
  description?: string | null;
  tags: string[];
  locations?: NetworkTaxonomyRow["locations"];
  regions?: string[] | null;
  targetCategory?: string[] | null;
}): ReturnType<typeof networkTaxonomyToPatch> {
  const form = networkTaxonomyFromRow({
    type: input.catalogType,
    venueType: input.venueCode ?? null,
    tags: input.tags,
    name: input.name,
    description: input.description ?? null,
    locations: input.locations ?? [],
    regions: input.regions ?? [],
    targetCategory: input.targetCategory ?? [],
  });
  return networkTaxonomyToPatch(form, input.tags);
}
