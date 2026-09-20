import type { MediaItem } from "@/lib/media-data";
import { resolveMediaDisplayPill } from "@/lib/media-display-labels";
import { categoryLabel } from "@/lib/media-categories";
import {
  intlLocaleTag,
  normalizeMediaDetailTextLocale,
  resolveMediaDisplayName,
  resolveMediaField,
} from "@/lib/media-i18n";
import {
  catalogPriceFieldToWon,
  formatMediaPriceCompactWon,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";

const META_DESC_MAX = 158;
const TITLE_MAX = 72;

function koreanUi(locale: string): boolean {
  return normalizeMediaDetailTextLocale(locale) === "ko";
}

function mediaTextSource(media: MediaItem) {
  return {
    name: media.name,
    nameEn: media.nameEn,
    location: media.location,
    locationEn: media.locationEn,
    description: media.description,
    descriptionEn: media.descriptionEn,
    translations: media.translations,
  };
}

/**
 * 고정 지점을 가진 매체인지 — 위치 파생 키워드(주변 역·랜드마크·시설)를
 * 쓸 수 있는지의 판정. 버스·택시 등 이동형은 노선 전체를 돌기 때문에
 * "주변" 이라는 개념 자체가 성립하지 않는다.
 */
export function isLocationBoundMedia(
  media: Pick<MediaItem, "type" | "subCategory">,
): boolean {
  if (media.type === "mobile") return false;
  const sub = media.subCategory?.toLowerCase() ?? "";
  return !/bus_exterior|bus_interior|taxi|vehicle_wrap|버스|택시|랩핑/.test(sub);
}

/**
 * DB/JSON(태그, 키워드필터, 위치, 유형 등)에서 SEO·AI 인용에 쓸 키 구문을 모읍니다.
 * 중복 제거, 과도한 길이(한 구문 48자) 제한.
 */
export function collectMediaSeoKeywordStrings(
  media: MediaItem,
  locale: string,
  max = 32,
): string[] {
  const koUi = koreanUi(locale);
  const pillLocale = normalizeMediaDetailTextLocale(locale);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (s?: string | null) => {
    if (!s || typeof s !== "string") return;
    const t = s
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48);
    if (t.length < 2) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };

  const pushMany = (arr?: readonly string[] | null) => {
    if (!arr) return;
    for (const x of arr) push(x);
  };

  pushMany(media.tags);
  if (media.subCategory) push(media.subCategory);

  push(resolveMediaDisplayPill(media, pillLocale === "ko" ? "ko" : "en"));

  if (media.keywordFilter) {
    pushMany(media.keywordFilter.searchKeywords);
    pushMany(media.keywordFilter.specialFeature);
    pushMany(media.keywordFilter.regionLabels);
    pushMany(media.keywordFilter.mediaLabels);
    pushMany(media.keywordFilter.targetLabels);
    pushMany(media.keywordFilter.industryLabels);
  }

  if (media.city) push(media.city);
  if (media.district) push(media.district);

  if (!isLocationBoundMedia(media)) {
    // 이동형 — 위치 파생 키워드 전부 생략
  } else {
    for (const raw of [media.nearbyStations, media.nearbyLandmarks]) {
      if (!raw) continue;
      for (const p of raw.split(/[,，、]/)) push(p);
    }
    if (media.nearbyFacilities) {
      for (const p of media.nearbyFacilities.split(/[,，、]/)) push(p);
    }
  }

  if (media.networkSubtype) push(media.networkSubtype);

  const feat = koUi ? media.features : media.featuresEn ?? media.features;
  if (feat) {
    for (const p of feat.split(/[,，、·.]/)) {
      const t = p.trim();
      if (t.length >= 2 && t.length <= 40) push(t);
    }
  }

  if (koUi) {
    push("옥외광고");
    push("OOH");
  } else {
    push("OOH");
    push("out-of-home");
  }

  return out.slice(0, max);
}

function resolveMediaSeoTypeLabel(media: MediaItem, locale: string): string {
  const pillLocale = normalizeMediaDetailTextLocale(locale);
  const catSlug = media.mediaCategory?.[0];
  if (catSlug) {
    const label = categoryLabel(catSlug, locale);
    if (label && label !== catSlug) return label;
  }
  if (media.subCategory?.trim()) return media.subCategory.trim();
  const pill = resolveMediaDisplayPill(
    media,
    pillLocale === "ko" ? "ko" : "en",
  );
  if (pill) return pill;
  return koreanUi(locale) ? "옥외광고" : "OOH";
}

function resolveMediaSeoDistrict(media: MediaItem, locale: string): string {
  const district = media.district?.trim() || media.city?.trim();
  if (district) return district;
  return resolveMediaField(locale, "location", mediaTextSource(media));
}

/** 메타·OG용 월 단가 — 카드/상세와 동일 `resolveMediaDisplayPrice` + 공용 컴팩트 포맷 */
export function formatMediaSeoMonthlyPriceLabel(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
  locale: string,
): string {
  const koUi = koreanUi(locale);
  const { priceWon } = resolveMediaDisplayPrice(media);
  if (priceWon <= 0) return "";

  const multi = (media.priceOptions?.length ?? 0) >= 2;
  const compact = formatMediaPriceCompactWon(priceWon, intlLocaleTag(locale));
  const amount = compact.replace(/^₩/, "");

  if (koUi) {
    const suffix = multi ? "~" : "";
    return `월 ${amount}원${suffix}`;
  }

  const prefix = multi ? "from " : "";
  return `${prefix}${compact}/mo`;
}

/** generateMetadata / OG용 제목 (유형·지역·단가 키워드 중심) */
export function buildMediaPageTitle(
  media: MediaItem,
  locale: string,
  brand: string = "옥외광고",
): string {
  const koUi = koreanUi(locale);
  const name = resolveMediaDisplayName(mediaTextSource(media), locale);
  const district = resolveMediaSeoDistrict(media, locale);
  const typeStr = resolveMediaSeoTypeLabel(media, locale);
  const pricePart = formatMediaSeoMonthlyPriceLabel(media, locale);
  const brandLabel = koUi ? brand : "OOH pricing";

  const core = pricePart
    ? `${name} ${typeStr} — ${district} ${pricePart} | ${brandLabel}`
    : `${name} ${typeStr} — ${district} | ${brandLabel}`;
  if (core.length <= TITLE_MAX) return core;
  const fallback = pricePart
    ? `${name} — ${district} ${pricePart} | ${brandLabel}`
    : `${name} — ${district} | ${brandLabel}`;
  return fallback.slice(0, TITLE_MAX);
}

function baseLongTextFromMedia(media: MediaItem, locale: string): string {
  const koUi = koreanUi(locale);
  if (koUi) {
    if (media.longDescriptionKo)
      return media.longDescriptionKo.replace(/\s+/g, " ").trim();
    if (media.catalogDescription)
      return media.catalogDescription.replace(/\s+/g, " ").trim();
    if (media.description)
      return media.description.replace(/\s+/g, " ").trim();
  } else {
    if (media.longDescriptionEn)
      return media.longDescriptionEn.replace(/\s+/g, " ").trim();
    if (media.catalogDescriptionEn)
      return media.catalogDescriptionEn.replace(/\s+/g, " ").trim();
    const resolved = resolveMediaField(
      locale,
      "description",
      mediaTextSource(media),
    );
    if (resolved) return resolved.replace(/\s+/g, " ").trim();
  }
  return "";
}

/** generateMetadata / twitter / og:description (짧은 스니펫) */
export function buildMediaMetaDescription(
  media: MediaItem,
  locale: string,
): string {
  const koUi = koreanUi(locale);
  const loc = resolveMediaField(locale, "location", mediaTextSource(media));
  const dailyFootfall = media.dailyFootTraffic;

  const won = media.keywordFilter
    ? Math.round(
        (media.keywordFilter.budgetMin + media.keywordFilter.budgetMax) / 2,
      )
    : catalogPriceFieldToWon(media.price ?? 0);

  let base: string;
  if (media.keywordFilter) {
    base = koUi
      ? `${loc} · ${media.keywordFilter.priceText} · 일 유동 ${dailyFootfall.toLocaleString()}명`
      : `${loc} · ${media.keywordFilter.priceText} · ${dailyFootfall.toLocaleString()} daily footfall`;
  } else {
    base = koUi
      ? `${loc} 일 유동 ${dailyFootfall.toLocaleString()}명, 가시성 ${media.visibilityScore ?? 0}점. 검증된 OOH 매체로 캠페인을 시뮬레이션해 보세요. ₩${won.toLocaleString()}`
      : `${loc} — ${dailyFootfall.toLocaleString()} daily footfall, visibility ${media.visibilityScore ?? 0}. Simulate your campaign on this verified OOH media. ₩${won.toLocaleString()}`;
  }

  const kws = collectMediaSeoKeywordStrings(media, locale, 24);
  const baseLower = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const extra = kws
    .filter((k) => {
      if (k.length < 2) return false;
      const kl = baseLower(k);
      if (kl.length >= 4 && baseLower(base).includes(kl.slice(0, 4))) return false;
      return true;
    })
    .slice(0, 5);

  if (extra.length === 0) return base.slice(0, META_DESC_MAX);
  const suffix = " · " + extra.join(" · ");
  const combined = `${base}${suffix}`;
  if (combined.length <= META_DESC_MAX) return combined;
  const budget = META_DESC_MAX - suffix.length - 1;
  if (budget < 48) return base.slice(0, META_DESC_MAX);
  return `${base.slice(0, budget).trimEnd()}${suffix}`.slice(0, META_DESC_MAX);
}

/** JSON-LD Place `description` — 본문 + 키워드 나열(검색/AI 읽기용) */
export function buildMediaSeoJsonDescription(
  media: MediaItem,
  locale: string,
  maxLength = 900,
): string {
  const koUi = koreanUi(locale);
  const long = baseLongTextFromMedia(media, locale);
  const name = resolveMediaDisplayName(mediaTextSource(media), locale);
  const loc = resolveMediaField(locale, "location", mediaTextSource(media));
  const kws = collectMediaSeoKeywordStrings(media, locale, 24);

  const head =
    (long || "").slice(0, 500) ||
    (koUi
      ? `${name}. ${loc}에 위치한 검증 OOH 옥외광고 매체. 일 유동인구 ${media.dailyFootTraffic.toLocaleString()}명, 가시성 ${media.visibilityScore ?? 0}점.`
      : `${name}. Verified OOH in ${loc}. ${media.dailyFootTraffic.toLocaleString()} daily footfall, visibility ${media.visibilityScore ?? 0}.`);
  const tail = kws.length
    ? koUi
      ? ` 관련 검색: ${kws.join(", ")}.`
      : ` Topical keywords: ${kws.join(", ")}.`
    : "";
  return `${head}${tail}`.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** 메타 `keywords` 필드(보조). 구글은 무시·다른 엔진/내부 힌트용. */
export function buildMediaMetaKeywordsList(
  media: MediaItem,
  locale: string,
  max = 30,
): string[] {
  return collectMediaSeoKeywordStrings(media, locale, max);
}
