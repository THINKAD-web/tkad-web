import { typeLabels, type MediaItem } from "@/lib/media-data";
import type { MediaCatalogFiltersState } from "@/lib/use-media-catalog-filters";

const PRECISION_FILTER_CATEGORIES: (keyof MediaCatalogFiltersState)[] = [
  "areaSpot",
  "mediaFormat",
  "targetPersona",
  "industryTag",
  "campaignPurpose",
  "duration",
  "specialFeature",
];

export function hasActiveMediaPrecisionSelections(
  filters: MediaCatalogFiltersState,
): boolean {
  for (const cat of PRECISION_FILTER_CATEGORIES) {
    const map = filters[cat] as Record<string, boolean> | undefined;
    if (map && Object.values(map).some(Boolean)) return true;
  }
  return false;
}

/** 키워드 JSON 매체: 검색·지역·매체·타겟을 앞에 두어 정밀 칩과의 정합을 높임 */
function mediaHaystack(m: MediaItem): string {
  const kf = m.keywordFilter;
  const facetFirst: (string | null | undefined)[] = [];
  if (kf) {
    facetFirst.push(
      ...kf.searchKeywords,
      ...kf.regionLabels,
      ...kf.mediaLabels,
      ...kf.targetLabels,
      ...kf.industryLabels,
      kf.specialFeature.join(" "),
    );
  }
  const parts: (string | null | undefined)[] = [
    ...facetFirst,
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.targetAge,
    m.subCategory,
    m.nearbyFacilities,
    m.description,
    m.features,
    typeLabels[m.type]?.ko,
    typeLabels[m.type]?.en,
    m.type,
    ...(m.tags ?? []),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

const AREA_PATTERNS: Record<string, RegExp> = {
  seongsu: /성수(?!동)|seongsu/i,
  seongsu_dong: /성수동/,
  gangnam: /강남|gangnam|테헤란|역삼|논현|논현역|신사|청담/,
  dosan: /도산|도산대로|압구정로데오/,
  hongdae: /홍대|홍익|상수|연희|망원|합정/,
  coex: /코엑스|coex|무역센터|봉은사/,
  sinnonhyeon: /신논현|논현역/,
  apgujeong: /압구정|청담/,
  samsung_dong: /삼성동|삼성역|코엑스/,
  yeouido: /여의도|yeouido|ifc|국회/,
  gwanghwamun: /광화문|세종대로|종로|시청역/,
};

const FORMAT_PATTERNS: Record<string, RegExp> = {
  billboard_led: /전광판|전자게시|led\s*보드|디지털\s*사이니지|dooh/i,
  billboard: /빌보드|billboard|대형\s*간판/,
  facade: /외벽|파사드|facade|월스크린/,
  wrapping: /랩핑|wrapping|차량\s*랩핑|건물\s*랩핑/,
  mediapole: /미디어폴|미디어\s*폴|미디어\s*기둥/,
  cube: /cube|큐브(?!릭)/i,
  shelter: /쉘터|버스쉘터|정류장/,
  taxi: /택시|taxi|모범택시|카카오\s*t/,
};

const PERSONA_PATTERNS: Record<string, RegExp> = {
  mz: /\bmz\b|z\s*세대|밀레니얼|gen\s*z/i,
  age_2030: /20대|30대|2030|밀레니얼/,
  kpop_fandom: /k-?pop|케이팝|팬덤|아이돌|응원|생일\s*광고|덕질/,
  hot_place_visitor:
    /핫플|핫\s*플|핫플레이스|핫\s*플레이스|유동인구|번화|번화가|관광객|명동|성지/,
  affluent_young: /구매력|소비|프리미엄|고소득|명품|럭셔리/,
};

const INDUSTRY_PATTERNS: Record<string, RegExp> = {
  fashion_beauty: /패션|뷰티|화장품|코스메|의류|잡화/,
  fnb: /식음료|f\s*&\s*b|카페|식당|외식|fmcg|맥주|주류/,
  entertainment_kpop: /엔터|k-?pop|공연|콘서트|음악|영화/,
  auto_tech: /자동차|차량|테크|it|전기차|ev|모빌리티/,
  finance_realestate: /금융|부동산|은행|보험|증권|대출/,
  retail: /리테일|유통|마트|편의점|소매/,
  government: /지자체|공공|시청|구청|도청|광역시/,
  institution: /기관|협회|공기업|공공기관|단체/,
};

const PURPOSE_PATTERNS: Record<string, RegExp> = {
  fan_support: /팬클럽|응원|서포트|생일|덕질|성지/,
  brand_campaign: /브랜드|캠페인|bi|ci|이미지\s*광고/,
  product_launch: /신제품|론칭|런칭|출시|프리오더/,
  event_promo: /이벤트|프로모션|세일|할인|팝업/,
};

function matchesAnySelected(
  selected: Partial<Record<string, boolean>>,
  patterns: Record<string, RegExp>,
  hay: string,
): boolean {
  const active = Object.entries(selected).filter(([, v]) => v);
  if (active.length === 0) return true;
  return active.some(([k]) => {
    const re = patterns[k];
    return re ? re.test(hay) : false;
  });
}

/** `m.price`는 만원 단위. 구간을 겹치게 해 중가 매체가 한 구간도 못 타지 않게 함 */
const DURATION_PRICE_RULES: Record<string, (price: number) => boolean> = {
  week: (p) => p >= 0 && p <= 1_200,
  two_to_four_weeks: (p) => p > 150 && p <= 6_000,
  month_1_3: (p) => p > 400 && p <= 14_000,
  month_3_plus: (p) => p > 4_000,
};

const SPECIAL_PATTERNS: Record<string, RegExp> = {
  qr: /qr|큐알|qrcode/i,
  interactive: /인터랙티브|interactive|터치/,
  "3d_motion": /3d|3\s*d|모션|입체/,
  ar: /\bar\b|증강현실|ar\s*광고/i,
  night_bright: /야간|조명|야경|심야|라이트업/,
};

export function passesMediaPrecisionFilters(
  m: MediaItem,
  filters: MediaCatalogFiltersState,
): boolean {
  const hay = mediaHaystack(m);

  if (!matchesAnySelected(filters.areaSpot ?? {}, AREA_PATTERNS, hay)) {
    return false;
  }

  if (!matchesAnySelected(filters.mediaFormat ?? {}, FORMAT_PATTERNS, hay)) {
    return false;
  }

  if (
    !matchesAnySelected(filters.targetPersona ?? {}, PERSONA_PATTERNS, hay)
  ) {
    return false;
  }

  if (!matchesAnySelected(filters.industryTag ?? {}, INDUSTRY_PATTERNS, hay)) {
    return false;
  }

  if (
    !matchesAnySelected(
      filters.campaignPurpose ?? {},
      PURPOSE_PATTERNS,
      hay,
    )
  ) {
    return false;
  }

  const activeDuration = Object.entries(filters.duration ?? {}).filter(
    ([, v]) => v,
  );
  if (activeDuration.length > 0) {
    const price = m.price ?? 0;
    const ok = activeDuration.some(([k]) => {
      const rule = DURATION_PRICE_RULES[k];
      return rule ? rule(price) : false;
    });
    if (!ok) return false;
  }

  const activeSpecial = Object.entries(filters.specialFeature ?? {}).filter(
    ([, v]) => v,
  );
  if (activeSpecial.length > 0) {
    const descStr = String((m as { description?: string }).description ?? "").toLowerCase();
    const sh = `${hay} ${descStr}`;
    const ok = activeSpecial.some(([k]) => {
      const re = SPECIAL_PATTERNS[k];
      return re ? re.test(sh) : false;
    });
    if (!ok) return false;
  }

  return true;
}
