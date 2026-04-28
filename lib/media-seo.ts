import { typeLabels, type MediaItem } from "@/lib/media-data";

const META_DESC_MAX = 158;
const TITLE_MAX = 72;

/**
 * DB/JSON(태그, 키워드필터, 위치, 유형 등)에서 SEO·AI 인용에 쓸 키 구문을 모읍니다.
 * 중복 제거, 과도한 길이(한 구문 48자) 제한.
 */
export function collectMediaSeoKeywordStrings(
  media: MediaItem,
  locale: string,
  max = 32,
): string[] {
  const isKo = locale === "ko";
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

  const tl = typeLabels[media.type];
  if (tl) push(isKo ? tl.ko : tl.en);

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

  for (const raw of [media.nearbyStations, media.nearbyLandmarks]) {
    if (!raw) continue;
    for (const p of raw.split(/[,，、]/)) push(p);
  }
  if (media.nearbyFacilities) {
    for (const p of media.nearbyFacilities.split(/[,，、]/)) push(p);
  }

  if (media.networkSubtype) push(media.networkSubtype);

  const feat = isKo ? media.features : media.featuresEn;
  if (feat) {
    for (const p of feat.split(/[,，、·.]/)) {
      const t = p.trim();
      if (t.length >= 2 && t.length <= 40) push(t);
    }
  }

  if (isKo) {
    push("옥외광고");
    push("OOH");
  } else {
    push("OOH");
    push("out-of-home");
  }

  return out.slice(0, max);
}

/** generateMetadata / OG용 제목 (타입 라벨 포함) */
export function buildMediaPageTitle(
  media: MediaItem,
  locale: string,
  brand: string = "THINKAD",
): string {
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  const loc = isKo ? media.location : media.locationEn || media.location;
  const tl = typeLabels[media.type];
  const typeStr = tl ? (isKo ? tl.ko : tl.en) : media.type;
  const core = typeStr
    ? `${name} · ${typeStr} — ${loc} | ${brand}`
    : `${name} - ${loc} | ${brand}`;
  return core.length > TITLE_MAX ? `${name} - ${loc} | ${brand}`.slice(0, TITLE_MAX) : core;
}

function baseLongTextFromMedia(media: MediaItem, isKo: boolean): string {
  if (isKo) {
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
    if (media.descriptionEn)
      return media.descriptionEn.replace(/\s+/g, " ").trim();
    if (media.description)
      return media.description.replace(/\s+/g, " ").trim();
  }
  return "";
}

/** generateMetadata / twitter / og:description (짧은 스니펫) */
export function buildMediaMetaDescription(
  media: MediaItem,
  locale: string,
): string {
  const isKo = locale === "ko";
  const loc = isKo ? media.location : media.locationEn || media.location;
  const dailyFootfall = media.dailyFootTraffic;

  const won = media.keywordFilter
    ? Math.round(
        (media.keywordFilter.budgetMin + media.keywordFilter.budgetMax) / 2,
      )
    : media.price * 10_000;

  let base: string;
  if (media.keywordFilter) {
    base = isKo
      ? `${loc} · ${media.keywordFilter.priceText} · 일 유동 ${dailyFootfall.toLocaleString()}명`
      : `${loc} · ${media.keywordFilter.priceText} · ${dailyFootfall.toLocaleString()} daily footfall`;
  } else {
    base = isKo
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
  const suffix = (isKo ? " · " : " · ") + extra.join(" · ");
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
  const isKo = locale === "ko";
  const long = baseLongTextFromMedia(media, isKo);
  const name = isKo ? media.name : media.nameEn || media.name;
  const loc = isKo ? media.location : media.locationEn || media.location;
  const kws = collectMediaSeoKeywordStrings(media, locale, 24);

  const head =
    (long || "").slice(0, 500) ||
    (isKo
      ? `${name}. ${loc}에 위치한 검증 OOH 옥외광고 매체. 일 유동인구 ${media.dailyFootTraffic.toLocaleString()}명, 가시성 ${media.visibilityScore ?? 0}점.`
      : `${name}. Verified OOH in ${loc}. ${media.dailyFootTraffic.toLocaleString()} daily footfall, visibility ${media.visibilityScore ?? 0}.`);
  const tail = kws.length
    ? (isKo
        ? ` 관련 검색: ${kws.join(", ")}.`
        : ` Topical keywords: ${kws.join(", ")}.`)
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
