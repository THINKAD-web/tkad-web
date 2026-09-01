import {
  browseCategoryLabel,
  inferBrowseCategoryFromMedia,
  isValidBrowseSub,
} from "@/lib/media-browse-categories";
import { browseRegionLabel } from "@/lib/media-browse-regions";
import { targetLabel, TARGET_CATEGORIES } from "@/lib/media-categories";
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
  bookstore: { main: "education", sub: "library" },
  office: { main: "building", sub: "office" },
  hospital: { main: "network", sub: "hospital_network" },
  pharmacy: { main: "building", sub: "hospital" },
  gym: { main: "lifestyle", sub: "gym" },
};

const TARGET_SLUG_SET = new Set(TARGET_CATEGORIES.map((t) => t.slug));

/** venue:* / DB 컬럼 / type 레거시 이후 — 이름·tags 키워드 추론 (명백한 단서만) */
const VENUE_HAYSTACK_RULES: Array<[RegExp, NetworkTypeCode]> = [
  [/교보문고|서점|bookstore/i, "bookstore"],
  [/약국|pharmacy/i, "pharmacy"],
  [/병원|의료|헬스케어|healthcare|hospital|진료|환자|의약/i, "hospital"],
  [
    /헬스장|피트니스|스포애니|fitness|gym|웰니스|wellness|어시스트핏|assistfit/i,
    "gym",
  ],
  [/대학\s*키오스크|캠퍼스\s*내|campus[\s_-]?kiosk/i, "campus_kiosk"],
  [/대학교|대학\s*광고|캠퍼스|campus/i, "campus_kiosk"],
  [/프라임오피스|오피스|office|빌딩|직장인\s*타겟/i, "office"],
  [/버스\s*쉘터|버스쉘터|정류장|bus[\s_-]?shelter/i, "bus_shelter"],
  [/편의점|convenience/i, "convenience_store"],
  [/쇼핑몰|백화점|shopping[\s_-]?mall/i, "shopping_mall"],
  [/엘리베이터|elevator/i, "elevator"],
];

/** target:* 이후 — tags·name 키워드 (과채움 방지, 명백한 단서만; brand 기본값 없음) */
const TARGET_HAYSTACK_RULES: Array<[RegExp, string]> = [
  [/팬덤|아이돌|팬클럽|fandom/i, "fandom"],
  [/학생\s*타겟|대학생|student/i, "university"],
  [/지자체|공공\s*캠페인|public\s*sector/i, "public"],
  [/글로벌|해외\s*브랜드|외국인|global|international|관광|k-콘텐츠/i, "global"],
  [/5060(?:\s*타겟)?|(?<![0-9])50대|(?<![0-9])60대|시니어|senior/i, "regional"],
  [/환자|보호자|의료\s*환경|진료과/i, "regional"],
  [/지역\s*축제|지역\s*홍보|동네|로컬\s*매장|마을/i, "regional"],
  [/소상공인|동네\s*매장|small\s*business/i, "small_business"],
  [/의약품|pharma|otc/i, "small_business"],
  [/팝업|이벤트|pop[\s-]?up|event/i, "event"],
  [
    /브랜드\s*캠페인|기업\s*브랜드|신제품|론칭|b2b|b2c|직장인|고소득|프리미엄\s*미디어|고관여/i,
    "brand",
  ],
];

/** venue 성격 + tags 조합으로 타깃 보강·brand 억제 */
function inferTargetsFromVenueContext(
  venueCode: string | null | undefined,
  hay: string,
): string[] {
  const venue = venueCode?.trim().toLowerCase() ?? "";
  const found = new Set<string>();

  if (venue === "pharmacy") {
    if (/5060(?:\s*타겟)?|(?<![0-9])50대|(?<![0-9])60대|시니어/i.test(hay)) found.add("regional");
    if (/건강|의약품|pharma|약국/i.test(hay)) found.add("small_business");
  }
  if (venue === "hospital") {
    if (/환자|보호자|의료|진료|헬스케어/i.test(hay)) found.add("regional");
  }
  if (venue === "office") {
    if (/직장인|고소득|b2b|b2c|오피스|프리미엄/i.test(hay)) found.add("brand");
  }

  return [...found];
}

/** 의료·로컬 venue에서는 약한 brand 신호 제거 */
function filterBrandForVenueContext(
  slugs: string[],
  venueCode: string | null | undefined,
  hay: string,
): string[] {
  const venue = venueCode?.trim().toLowerCase() ?? "";
  if (!slugs.includes("brand")) return slugs;
  const strongBrand = /브랜드\s*캠페인|기업\s*브랜드|b2b|b2c|직장인|고소득|프리미엄\s*미디어/i.test(
    hay,
  );
  if (strongBrand) return slugs;
  if (venue === "pharmacy" || venue === "hospital" || venue === "gym") {
    return slugs.filter((s) => s !== "brand");
  }
  return slugs;
}

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

function buildTaxonomyHaystack(input: {
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
}): string {
  const tagText = (input.tags ?? [])
    .filter((t) => {
      const s = t.trim();
      return s && !s.startsWith("venue:") && !TARGET_TAG_RE.test(s);
    })
    .join(" ");
  return [input.name, input.description, tagText]
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ");
}

/** target 추론용 — description 제외 (마케팅 문구·수치 오매칭 방지) */
function buildTargetHaystack(input: {
  name?: string | null;
  tags?: string[] | null;
}): string {
  const tagText = (input.tags ?? [])
    .filter((t) => {
      const s = t.trim();
      return s && !s.startsWith("venue:") && !TARGET_TAG_RE.test(s);
    })
    .join(" ");
  return [input.name, tagText]
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ");
}

/** 이름·tags·description에서 venue 추론 (명시 venue:* / DB 컬럼은 호출 전 처리) */
export function inferNetworkVenueFromHaystack(input: {
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
}): NetworkTypeCode | null {
  const hay = buildTaxonomyHaystack(input);
  if (!hay.trim()) return null;
  for (const [re, code] of VENUE_HAYSTACK_RULES) {
    if (re.test(hay)) return code;
  }
  return null;
}

/** target:* 이후 tags·name에서 타깃 slug 추론 */
export function inferTargetSlugsFromHaystack(input: {
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
  venueCode?: string | null;
}): string[] {
  const explicit = parseTargetSlugsFromTags(input.tags);
  if (explicit.length > 0) return explicit;

  const hay = buildTargetHaystack(input);
  if (!hay.trim()) return [];

  const found = new Set<string>();
  for (const [re, slug] of TARGET_HAYSTACK_RULES) {
    if (re.test(hay) && TARGET_SLUG_SET.has(slug)) found.add(slug);
  }
  for (const slug of inferTargetsFromVenueContext(input.venueCode, hay)) {
    if (TARGET_SLUG_SET.has(slug)) found.add(slug);
  }

  return filterBrandForVenueContext([...found], input.venueCode, hay);
}

export function suggestBrowseFromVenue(
  venueCode: string,
): { main: string; sub: string } | null {
  const v = venueCode.trim().toLowerCase();
  if (!v || !isNetworkVenueCode(v)) return null;
  return VENUE_TO_BROWSE[v as NetworkTypeCode] ?? null;
}

export function resolveNetworkVenueCodeFromRow(
  row: Pick<
    NetworkTaxonomyRow,
    "type" | "tags" | "venueType" | "name" | "description"
  >,
): string | null {
  const fromCol = row.venueType?.trim();
  if (fromCol && isNetworkVenueCode(fromCol)) return fromCol;
  const fromTags = resolveNetworkVenueCode(row.type, row.tags);
  if (fromTags) return fromTags;
  return inferNetworkVenueFromHaystack({
    name: row.name,
    description: row.description,
    tags: row.tags,
  });
}

export function resolveNetworkCatalogTypeFromRow(
  row: Pick<NetworkTaxonomyRow, "type" | "tags" | "venueType">,
): NetworkCatalogType {
  const t = row.type.trim().toLowerCase();
  if (t === "dooh" || t === "digital" || t === "static" || t === "mobile") {
    return t === "digital" ? "dooh" : t;
  }
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
  const venue =
    input.venueCode?.trim() ||
    inferNetworkVenueFromHaystack({
      name: input.name,
      description: input.description,
      tags: input.tags,
    });
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
    fromCol.length > 0
      ? [...fromCol]
      : inferTargetSlugsFromHaystack({
          name: row.name,
          description: row.description,
          tags: row.tags,
          venueCode: venueCode || null,
        });

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
  row: Pick<
    NetworkTaxonomyRow,
    "targetCategory" | "tags" | "name" | "description" | "type" | "venueType"
  >,
): string[] | undefined {
  const fromCol = row.targetCategory ?? [];
  if (fromCol.length > 0) return [...fromCol];
  const venueCode = resolveNetworkVenueCodeFromRow(row);
  const inferred = inferTargetSlugsFromHaystack({
    name: row.name,
    description: row.description,
    tags: row.tags,
    venueCode,
  });
  return inferred.length > 0 ? inferred : undefined;
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
