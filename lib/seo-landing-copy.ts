/**
 * Tier-1 매체 카테고리·마케팅 유형 랜딩 — 키워드 중심 title/H1/description 패턴.
 * count=0 이면 개수 구문 생략 (thin/어색한 "0개" 방지).
 */

export const TIER1_MEDIA_CATEGORY_SLUGS = [
  "billboard",
  "subway",
  "bus",
  "bus_shelter",
  "elevator",
  "dooh",
] as const;

export type Tier1MediaCategorySlug = (typeof TIER1_MEDIA_CATEGORY_SLUGS)[number];

export function isTier1MediaCategorySlug(
  slug: string,
): slug is Tier1MediaCategorySlug {
  return (TIER1_MEDIA_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

function countKo(n: number, unit = "개"): string {
  return n > 0 ? `${n}${unit}` : "";
}

function countEn(n: number): string {
  return n > 0 ? String(n) : "";
}

/** `<title>` — Tier-1 카테고리 (`/media/category/*`) */
export function tier1CategoryLandingTitle(
  slug: Tier1MediaCategorySlug,
  locale: string,
  count: number,
): string | null {
  const isKo = locale.startsWith("ko");
  const nKo = countKo(count);
  const nEn = countEn(count);

  if (isKo) {
    switch (slug) {
      case "billboard":
        return nKo
          ? `전광판 광고 단가 ${nKo} 비교 | 위치·월 비용·견적 | THINKAD`
          : "전광판 광고 단가 비교 | 위치·월 비용·견적 | THINKAD";
      case "subway":
        return nKo
          ? `지하철 광고 비용 ${nKo} | 역·노선별 단가 비교 | THINKAD`
          : "지하철 광고 비용 | 역·노선별 단가 비교 | THINKAD";
      case "bus":
        return nKo
          ? `버스 광고 단가 ${nKo} | 래핑·차내·쉘터 비용 | THINKAD`
          : "버스 광고 단가 | 래핑·차내·쉘터 비용 | THINKAD";
      case "bus_shelter":
        return nKo
          ? `버스쉘터 광고 비용 ${nKo} | 정류장·쉘터 단가 비교 | THINKAD`
          : "버스쉘터 광고 비용 | 정류장·쉘터 단가 비교 | THINKAD";
      case "elevator":
        return nKo
          ? `엘리베이터 광고 비용 ${nKo} | 아파트·오피스 단가 | THINKAD`
          : "엘리베이터 광고 비용 | 아파트·오피스 단가 | THINKAD";
      case "dooh":
        return nKo
          ? `디지털 사이니지 광고 단가 ${nKo} | DOOH·미디어폴 비용 | THINKAD`
          : "디지털 사이니지 광고 단가 | DOOH·미디어폴 비용 | THINKAD";
      default:
        return null;
    }
  }

  switch (slug) {
    case "billboard":
      return nEn
        ? `Billboard ad pricing — ${nEn} placements | THINKAD`
        : "Billboard ad pricing — compare costs | THINKAD";
    case "subway":
      return nEn
        ? `Subway ad costs — ${nEn} placements | THINKAD`
        : "Subway ad costs — station & line pricing | THINKAD";
    case "bus":
      return nEn
        ? `Bus ad pricing — ${nEn} placements | THINKAD`
        : "Bus ad pricing — wrap, interior & shelter | THINKAD";
    case "bus_shelter":
      return nEn
        ? `Bus shelter ad costs — ${nEn} placements | THINKAD`
        : "Bus shelter ad costs — compare pricing | THINKAD";
    case "elevator":
      return nEn
        ? `Elevator ad costs — ${nEn} placements | THINKAD`
        : "Elevator ad costs — apartment & office | THINKAD";
    case "dooh":
      return nEn
        ? `DOOH pricing — ${nEn} digital placements | THINKAD`
        : "DOOH & digital signage pricing | THINKAD";
    default:
      return null;
  }
}

/** H1 — Tier-1 카테고리 히어로 */
export function tier1CategoryHeroTitle(
  slug: Tier1MediaCategorySlug,
  locale: string,
  count: number,
): string | null {
  const isKo = locale.startsWith("ko");
  const nKo = countKo(count);
  const nEn = countEn(count);

  if (isKo) {
    switch (slug) {
      case "billboard":
        return nKo
          ? `전광판 광고 단가 — ${nKo} 매체 비교`
          : "전광판 광고 단가 비교";
      case "subway":
        return nKo
          ? `지하철 광고 비용 — 역·노선별 ${nKo} 매체`
          : "지하철 광고 비용 — 역·노선별 단가 비교";
      case "bus":
        return nKo
          ? `버스 광고 단가 — ${nKo} 매체 비교`
          : "버스 광고 단가 — 래핑·차내·쉘터";
      case "bus_shelter":
        return nKo
          ? `버스쉘터 광고 비용 — ${nKo} 매체`
          : "버스쉘터 광고 비용 비교";
      case "elevator":
        return nKo
          ? `엘리베이터 광고 비용 — ${nKo} 매체`
          : "엘리베이터 광고 비용 — 아파트·오피스";
      case "dooh":
        return nKo
          ? `디지털 사이니지 광고 단가 — ${nKo} 매체`
          : "디지털·DOOH 광고 단가 비교";
      default:
        return null;
    }
  }

  switch (slug) {
    case "billboard":
      return nEn
        ? `Billboard pricing — ${nEn} verified media`
        : "Billboard ad pricing comparison";
    case "subway":
      return nEn
        ? `Subway ad costs — ${nEn} placements`
        : "Subway ad costs by station & line";
    case "bus":
      return nEn
        ? `Bus ad pricing — ${nEn} placements`
        : "Bus advertising pricing";
    case "bus_shelter":
      return nEn
        ? `Bus shelter costs — ${nEn} placements`
        : "Bus shelter advertising costs";
    case "elevator":
      return nEn
        ? `Elevator ad costs — ${nEn} placements`
        : "Elevator advertising costs";
    case "dooh":
      return nEn
        ? `DOOH pricing — ${nEn} placements`
        : "DOOH & digital signage pricing";
    default:
      return null;
  }
}

/** description — Tier-1 카테고리 (단가·즉시 견적 강조) */
export function tier1CategoryLandingDescription(
  slug: Tier1MediaCategorySlug,
  locale: string,
  count: number,
): string | null {
  const isKo = locale.startsWith("ko");
  const nKo = countKo(count, "개 매체");
  const nEn = countEn(count);

  if (isKo) {
    const prefix = nKo ? `전국 ${nKo}. ` : "";
    const tail =
      "월 단가·위치·예상 노출을 비교하고 즉시 견적하세요. THINKAD 싱커드.";
    switch (slug) {
      case "billboard":
        return `${prefix}전광판·빌보드 광고비를 실시간으로 비교. ${tail}`;
      case "subway":
        return `${prefix}지하철 역·노선별 광고 비용과 단가를 한눈에. ${tail}`;
      case "bus":
        return `${prefix}버스 래핑·차내·쉘터 광고 단가 비교. ${tail}`;
      case "bus_shelter":
        return `${prefix}버스쉘터·정류장 광고 비용 비교. ${tail}`;
      case "elevator":
        return `${prefix}아파트·오피스 엘리베이터 광고 단가. ${tail}`;
      case "dooh":
        return `${prefix}DOOH·미디어폴·디지털 사이니지 단가 비교. ${tail}`;
      default:
        return null;
    }
  }

  const prefix = nEn ? `${nEn} verified placements. ` : "";
  const tail = "Compare monthly rates, locations, and reach — get a quote on THINKAD.";
  switch (slug) {
    case "billboard":
      return `${prefix}Billboard & LED pricing nationwide. ${tail}`;
    case "subway":
      return `${prefix}Subway advertising costs by station and line. ${tail}`;
    case "bus":
      return `${prefix}Bus wrap, interior, and shelter ad pricing. ${tail}`;
    case "bus_shelter":
      return `${prefix}Bus shelter and street furniture costs. ${tail}`;
    case "elevator":
      return `${prefix}Elevator screen advertising in apartments & offices. ${tail}`;
    case "dooh":
      return `${prefix}DOOH, media poles, and digital signage rates. ${tail}`;
    default:
      return null;
  }
}
