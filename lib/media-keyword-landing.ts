/**
 * 키워드 랜딩 페이지 (`/media/region/[region]`, `/media/type/[type]`) 공유 헬퍼.
 *
 * - 슬러그 → 표시 라벨 (한/영) 매핑
 * - SEO title / description 템플릿 (AI 생성 X — 단순 치환)
 * - 알 수 없는 슬러그 → null (라우트 에서 notFound 처리)
 *
 * 데이터 소스: DB 의 `region` / `type` 필드 unique values 기준.
 */

export type RegionSlug = "seoul" | "busan" | "jeju" | "national" | string;
export type TypeSlug = "digital" | "static" | "mobile" | "network" | string;

const REGION_LABELS: Record<string, { ko: string; en: string }> = {
  seoul: { ko: "서울", en: "Seoul" },
  busan: { ko: "부산", en: "Busan" },
  jeju: { ko: "제주", en: "Jeju" },
  national: { ko: "전국", en: "Nationwide" },
};

const TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  digital: { ko: "디지털 사이니지", en: "Digital signage" },
  static: { ko: "고정형 빌보드", en: "Static billboard" },
  mobile: { ko: "이동형 매체", en: "Transit media" },
  network: { ko: "네트워크 패키지", en: "Network package" },
};

export function regionLabel(slug: string, locale: string): string {
  const labels = REGION_LABELS[slug];
  if (labels) return locale === "ko" ? labels.ko : labels.en;
  // 알 수 없는 슬러그 → 첫 글자 대문자 + decode
  try {
    return decodeURIComponent(slug).replace(/^./, (c) => c.toUpperCase());
  } catch {
    return slug;
  }
}

export function typeLabel(slug: string, locale: string): string {
  const labels = TYPE_LABELS[slug];
  if (labels) return locale === "ko" ? labels.ko : labels.en;
  try {
    return decodeURIComponent(slug).replace(/^./, (c) => c.toUpperCase());
  } catch {
    return slug;
  }
}

/** 알려진 region/type 슬러그 (sitemap fallback / static params 가능) */
export const KNOWN_REGION_SLUGS = Object.keys(REGION_LABELS);
export const KNOWN_TYPE_SLUGS = Object.keys(TYPE_LABELS);

/** District(시·군·구) 표시 라벨 — 한글 슬러그 그대로 노출. */
export function areaLabel(slug: string, _locale: string): string {
  void _locale;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function areaLandingTitle(slug: string, locale: string, count: number): string {
  const label = areaLabel(slug, locale);
  if (locale === "ko") {
    return `${label} OOH 광고 매체 — THINKAD 검증 ${count}개`;
  }
  return `${label} OOH advertising — ${count} verified media · THINKAD`;
}

export function areaLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  const label = areaLabel(slug, locale);
  if (locale === "ko") {
    return `${label}에서 집행 가능한 OOH(옥외광고) 매체 ${count}개. 빌보드 · 디지털 사이니지 · 교통광고 등 THINKAD 가 직접 검증한 매체 정보를 비교하세요.`;
  }
  return `${count} OOH media in ${label} verified by THINKAD: billboards, digital signage, transit. Compare prices and locations.`;
}

export function regionLandingTitle(slug: string, locale: string, count: number): string {
  const label = regionLabel(slug, locale);
  if (locale === "ko") {
    return `${label} OOH 광고 매체 — THINKAD 검증 ${count}개`;
  }
  return `${label} OOH advertising — ${count} verified media · THINKAD`;
}

export function regionLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  const label = regionLabel(slug, locale);
  if (locale === "ko") {
    return `${label} 지역에서 집행 가능한 OOH(옥외광고) 매체 ${count}개. 빌보드·디지털 사이니지·교통광고 등 THINKAD 가 직접 검증한 매체 정보를 확인하세요.`;
  }
  return `${count} OOH media in ${label} verified by THINKAD: billboards, digital signage, transit ads. Compare prices and locations.`;
}

export function typeLandingTitle(slug: string, locale: string, count: number): string {
  const label = typeLabel(slug, locale);
  if (locale === "ko") {
    return `${label} 매체 — THINKAD 검증 ${count}개 (전국)`;
  }
  return `${label} media — ${count} verified across Korea · THINKAD`;
}

export function typeLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  const label = typeLabel(slug, locale);
  if (locale === "ko") {
    return `전국에서 집행 가능한 ${label} 매체 ${count}개. THINKAD 가 직접 현장 검증한 매체로 가격·위치·유동인구 데이터를 비교하세요.`;
  }
  return `${count} ${label.toLowerCase()} media nationwide verified by THINKAD. Compare price, location, and traffic data.`;
}
