/**
 * 매체 카테고리 · 캠페인 타겟 분류 — 정적 taxonomy (DB 시드 소스).
 */

export type CategoryNode = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  icon?: string;
  descriptionKo?: string;
  descriptionEn?: string;
  order: number;
  parentId?: string | null;
  /** SEO/랜딩용 */
  heroSubtitleKo?: string;
  heroSubtitleEn?: string;
  insightKo?: string;
  insightEn?: string;
  faqKo?: { q: string; a: string }[];
  faqEn?: { q: string; a: string }[];
  seoKeywordsKo?: string[];
};

export type TargetNode = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  icon?: string;
  descriptionKo?: string;
  descriptionEn?: string;
  order: number;
  recommendedSlugs?: string[];
  popularTagsKo?: string[];
  heroSubtitleKo?: string;
  heroSubtitleEn?: string;
  guideStepsKo?: string[];
  guideStepsEn?: string[];
  faqKo?: { q: string; a: string }[];
  faqEn?: { q: string; a: string }[];
  seoKeywordsKo?: string[];
};

const SUB = (
  parentId: string,
  slug: string,
  nameKo: string,
  nameEn: string,
  order: number,
): CategoryNode => ({
  id: slug,
  slug,
  nameKo,
  nameEn,
  parentId,
  order,
});

export const MEDIA_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "transit",
    slug: "transit",
    nameKo: "교통매체",
    nameEn: "Transit",
    icon: "🚇",
    order: 1,
    descriptionKo: "지하철·버스·택시·공항 등 이동 중 노출 매체",
    descriptionEn: "OOH on subway, bus, taxi, airport and rail",
    heroSubtitleKo: "매일 출퇴근·이동하는 수백만 명에게 도달",
    heroSubtitleEn: "Reach commuters and travelers at scale",
    insightKo:
      "교통매체는 반복 노출과 긴 체류 시간으로 브랜드 리콜을 높입니다. 역사·차내·쉘터 등 포맷별로 타깃 동선을 선택할 수 있습니다.",
    seoKeywordsKo: ["지하철 광고", "버스 광고", "교통매체 광고"],
    faqKo: [
      { q: "지하철 광고 비용은?", a: "역·노선·사이즈에 따라 월 수십만~수천만 원대입니다. 매체별 견적을 확인하세요." },
      { q: "최소 집행 기간은?", a: "대부분 1개월 이상이며, 매체별로 상이합니다." },
    ],
  },
  SUB("transit", "subway", "지하철", "Subway", 1),
  SUB("transit", "subway_station", "역사광고", "Station ads", 2),
  SUB("transit", "subway_incar", "차내광고", "In-car ads", 3),
  SUB("transit", "subway_screendoor", "스크린도어", "Platform screen doors", 4),
  SUB("transit", "bus", "버스", "Bus", 5),
  SUB("transit", "bus_wrap", "버스 외부 래핑", "Bus wrap", 6),
  SUB("transit", "bus_interior", "버스 내부", "Bus interior", 7),
  SUB("transit", "bus_shelter", "버스 쉘터", "Bus shelter", 8),
  SUB("transit", "taxi", "택시 탑광고", "Taxi top", 9),
  SUB("transit", "airport_rail", "공항·KTX·항만", "Airport / KTX / Port", 10),

  {
    id: "billboard",
    slug: "billboard",
    nameKo: "빌보드/전광판",
    nameEn: "Billboard & LED",
    icon: "📺",
    order: 2,
    descriptionKo: "도로변·빌딩·옥상 대형 전광 매체",
    descriptionEn: "Large-format roadside and building LED",
    heroSubtitleKo: "도심 랜드마크에서 브랜드를 각인",
    seoKeywordsKo: ["전광판 광고", "빌보드 광고", "옥외전광판"],
    faqKo: [
      { q: "전광판 광고 비용은?", a: "위치·사이즈·송출 시간에 따라 월 수백만~수억 원대입니다." },
    ],
  },
  SUB("billboard", "roadside_billboard", "도로변 대형 빌보드", "Roadside billboard", 1),
  SUB("billboard", "building_facade", "빌딩 외벽", "Building facade", 2),
  SUB("billboard", "rooftop_led", "옥상 전광판", "Rooftop LED", 3),
  SUB("billboard", "overpass", "고가/교각 광고", "Overpass / gantry", 4),

  {
    id: "dooh",
    slug: "dooh",
    nameKo: "디지털 사이니지 (DOOH)",
    nameEn: "DOOH",
    icon: "💡",
    order: 3,
    descriptionKo: "미디어폴·실내·쇼핑몰·엘리베이터 디지털",
    descriptionEn: "Media poles, indoor, mall and elevator digital",
    heroSubtitleKo: "디지털 송출로 유연한 크리에이티브",
    seoKeywordsKo: ["DOOH", "미디어폴", "디지털 사이니지", "강남 미디어폴"],
  },
  SUB("dooh", "media_pole", "미디어폴", "Media pole", 1),
  SUB("dooh", "indoor_digital", "실내 디지털", "Indoor digital", 2),
  SUB("dooh", "mall_digital", "쇼핑몰 디지털월", "Mall digital wall", 3),
  SUB("dooh", "elevator", "엘리베이터 광고", "Elevator ads", 4),

  {
    id: "campus",
    slug: "campus",
    nameKo: "대학가/캠퍼스",
    nameEn: "Campus",
    icon: "🎓",
    order: 4,
    descriptionKo: "대학 캠퍼스·학생 타깃 매체",
    descriptionEn: "University and youth campus OOH",
    seoKeywordsKo: ["대학교 광고", "캠퍼스 광고", "대학가 옥외광고"],
  },
  SUB("campus", "campus_board", "캠퍼스 광고", "Campus boards", 1),
  SUB("campus", "campus_cafe", "학생식당/카페", "Campus F&B", 2),
  SUB("campus", "campus_club", "동아리/학과 게시판", "Club boards", 3),
  SUB("campus", "campus_library", "도서관/강의실", "Library / classroom", 4),

  {
    id: "retail",
    slug: "retail",
    nameKo: "쇼핑몰/마트",
    nameEn: "Retail",
    icon: "🏬",
    order: 5,
    descriptionKo: "백화점·마트·편의점·영화관",
    descriptionEn: "Department stores, marts, c-stores, cinemas",
    seoKeywordsKo: ["백화점 광고", "마트 광고", "쇼핑몰 광고"],
  },
  SUB("retail", "department_store", "백화점 미디어월", "Department store", 1),
  SUB("retail", "hypermarket", "대형마트", "Hypermarket", 2),
  SUB("retail", "convenience", "편의점", "Convenience store", 3),
  SUB("retail", "cinema", "영화관/극장", "Cinema", 4),

  {
    id: "facility",
    slug: "facility",
    nameKo: "쉘터/시설물",
    nameEn: "Street furniture",
    icon: "🏘",
    order: 6,
    descriptionKo: "쉘터·공원·가로등 등 거리 시설",
    descriptionEn: "Shelters, parks, street furniture",
    seoKeywordsKo: ["버스쉘터 광고", "가로등 배너"],
  },
  SUB("facility", "shelter", "버스 쉘터", "Bus shelter", 1),
  SUB("facility", "park_plaza", "공원/광장", "Park / plaza", 2),
  SUB("facility", "restroom", "공중화장실", "Restroom ads", 3),
  SUB("facility", "street_banner", "가로등 배너", "Street banner", 4),

  {
    id: "local",
    slug: "local",
    nameKo: "로컬/지역 매체",
    nameEn: "Local media",
    icon: "📍",
    order: 7,
    descriptionKo: "동네 빌보드·지역 신문·마을 게시판",
    descriptionEn: "Neighborhood boards and local radio",
    seoKeywordsKo: ["동네 광고", "지역 옥외광고", "로컬 광고"],
  },
  SUB("local", "neighborhood_board", "동네 빌보드", "Neighborhood board", 1),
  SUB("local", "local_paper", "지역 신문", "Local paper", 2),
  SUB("local", "community_board", "마을 게시판", "Community board", 3),
  SUB("local", "local_radio", "지역 라디오/케이블", "Local radio", 4),
];

export const TARGET_CATEGORIES: TargetNode[] = [
  {
    id: "brand",
    slug: "brand",
    nameKo: "기업 브랜드",
    nameEn: "Brand campaigns",
    icon: "🏢",
    order: 1,
    descriptionKo: "기업 인지도, 브랜드 캠페인, 신제품 론칭",
    descriptionEn: "Corporate awareness and product launches",
    recommendedSlugs: ["media_pole", "roadside_billboard", "dooh"],
    seoKeywordsKo: ["브랜드 캠페인", "기업 옥외광고"],
    guideStepsKo: ["매체 선택", "소재 제작", "일정·견적", "집행"],
  },
  {
    id: "fandom",
    slug: "fandom",
    nameKo: "팬덤/엔터테인먼트",
    nameEn: "Fandom & entertainment",
    icon: "🎤",
    order: 2,
    descriptionKo: "아이돌 생일·팬클럽 응원, 드라마/영화 홍보",
    descriptionEn: "Birthday ads, fan support, entertainment promos",
    recommendedSlugs: ["subway_station", "media_pole", "mall_digital"],
    popularTagsKo: ["아이돌 생일광고 추천", "팬덤 응원 광고"],
    heroSubtitleKo: "내 최애의 특별한 날을 더 빛나게",
    guideStepsKo: [
      "매체 선택 (강남역·홍대·코엑스 등)",
      "소재 제작 (디자인 가이드 확인)",
      "일정·견적 협의",
      "집행 및 현장 인증",
    ],
    guideStepsEn: [
      "Choose media (Gangnam, Hongdae, COEX…)",
      "Prepare creative assets",
      "Schedule and quote",
      "Launch and on-site proof",
    ],
    faqKo: [
      { q: "최소 집행 기간?", a: "매체별 1~2주부터 가능한 경우가 많습니다." },
      { q: "현장 인증 가능한가요?", a: "집행 후 사진·영상 인증을 요청할 수 있습니다." },
    ],
    seoKeywordsKo: ["아이돌 생일광고", "팬클럽 응원 광고", "팬덤 광고"],
  },
  {
    id: "public",
    slug: "public",
    nameKo: "지자체/공공",
    nameEn: "Public sector",
    icon: "🏛",
    order: 3,
    descriptionKo: "정부·지자체 캠페인, 보건/안전, 정책 홍보",
    descriptionEn: "Government and public awareness campaigns",
    recommendedSlugs: ["bus_shelter", "subway", "park_plaza"],
    seoKeywordsKo: ["지자체 옥외광고", "공공 캠페인"],
  },
  {
    id: "regional",
    slug: "regional",
    nameKo: "지역 프로모션",
    nameEn: "Regional promotion",
    icon: "🗺",
    order: 4,
    descriptionKo: "지역 축제, 문화행사, 정책 홍보",
    descriptionEn: "Local festivals and regional campaigns",
    recommendedSlugs: ["neighborhood_board", "local_paper", "street_banner"],
    seoKeywordsKo: ["지역 축제 광고", "지역 홍보"],
  },
  {
    id: "small_business",
    slug: "small_business",
    nameKo: "소상공인/로컬",
    nameEn: "Small business",
    icon: "🛍",
    order: 5,
    descriptionKo: "동네 매장, 오픈 행사, 이벤트",
    descriptionEn: "Local shops and store openings",
    recommendedSlugs: ["bus_shelter", "neighborhood_board", "hypermarket"],
    seoKeywordsKo: ["소상공인 광고", "동네 매장 광고"],
  },
  {
    id: "event",
    slug: "event",
    nameKo: "이벤트/팝업",
    nameEn: "Events & pop-ups",
    icon: "🎉",
    order: 6,
    descriptionKo: "팝업 스토어, 한정 캠페인, 시즌 이벤트",
    descriptionEn: "Pop-up stores and seasonal campaigns",
    recommendedSlugs: ["media_pole", "indoor_digital", "mall_digital"],
    seoKeywordsKo: ["팝업스토어 광고", "이벤트 옥외광고"],
  },
  {
    id: "university",
    slug: "university",
    nameKo: "대학교/캠퍼스 타겟",
    nameEn: "University target",
    icon: "🎓",
    order: 7,
    descriptionKo: "대학생 타깃, 신학기·축제 캠페인",
    descriptionEn: "Campus-targeted youth campaigns",
    recommendedSlugs: ["campus_board", "campus_cafe", "neighborhood_board"],
    seoKeywordsKo: ["대학교 광고", "캠퍼스 마케팅"],
  },
  {
    id: "seasonal",
    slug: "seasonal",
    nameKo: "시즌·연말 캠페인",
    nameEn: "Seasonal campaigns",
    icon: "📅",
    order: 8,
    descriptionKo: "연말·명절·시즌 프로모션, 한정 기간 집행",
    descriptionEn: "Holiday, seasonal, and limited-time campaigns",
    recommendedSlugs: ["media_pole", "mall_digital", "roadside_billboard"],
    seoKeywordsKo: ["시즌 광고", "연말 옥외광고", "시즌 캠페인"],
  },
  {
    id: "global",
    slug: "global",
    nameKo: "글로벌·해외 브랜드",
    nameEn: "Global brands",
    icon: "🌏",
    order: 9,
    descriptionKo: "해외 브랜드 런칭, K-콘텐츠·관광 연계 캠페인",
    descriptionEn: "International launches and tourism-linked OOH",
    recommendedSlugs: ["media_pole", "roadside_billboard", "airport_rail"],
    seoKeywordsKo: ["글로벌 브랜드 광고", "해외 브랜드 옥외광고", "K-콘텐츠 광고"],
  },
];

/** Flat list including all nodes */
export function flattenMediaCategories(): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const top of MEDIA_CATEGORY_TREE.filter((c) => !c.parentId)) {
    out.push(top);
    for (const sub of MEDIA_CATEGORY_TREE.filter((c) => c.parentId === top.id)) {
      out.push(sub);
    }
  }
  return out;
}

export function getMediaCategoryBySlug(slug: string): CategoryNode | undefined {
  return flattenMediaCategories().find((c) => c.slug === slug);
}

export function getTargetCategoryBySlug(slug: string): TargetNode | undefined {
  return TARGET_CATEGORIES.find((t) => t.slug === slug);
}

export function getTopMediaCategories(): CategoryNode[] {
  return MEDIA_CATEGORY_TREE.filter((c) => !c.parentId).sort(
    (a, b) => a.order - b.order,
  );
}

export function getChildCategories(parentSlug: string): CategoryNode[] {
  const parent = getMediaCategoryBySlug(parentSlug);
  if (!parent) return [];
  return MEDIA_CATEGORY_TREE.filter((c) => c.parentId === parent.id).sort(
    (a, b) => a.order - b.order,
  );
}

export function categoryLabel(slug: string, locale: string): string {
  const c = getMediaCategoryBySlug(slug);
  if (!c) return slug;
  return locale.startsWith("ko") ? c.nameKo : c.nameEn;
}

export function targetLabel(slug: string, locale: string): string {
  const t = getTargetCategoryBySlug(slug);
  if (!t) return slug;
  return locale.startsWith("ko") ? t.nameKo : t.nameEn;
}

/** chips for browse — top + popular subs */
export const BROWSE_CATEGORY_CHIPS = [
  "all",
  "subway",
  "bus",
  "billboard",
  "dooh",
  "campus",
  "retail",
  "local",
] as const;

export type BrowseCategoryChip = (typeof BROWSE_CATEGORY_CHIPS)[number];

export function chipToCategorySlugs(chip: BrowseCategoryChip): string[] {
  if (chip === "all") return [];
  if (chip === "subway") return ["subway", "subway_station", "subway_incar", "subway_screendoor", "transit"];
  if (chip === "bus") return ["bus", "bus_wrap", "bus_interior", "bus_shelter", "transit"];
  if (chip === "billboard") return ["billboard", "roadside_billboard", "building_facade", "rooftop_led", "overpass"];
  if (chip === "dooh") return ["dooh", "media_pole", "indoor_digital", "mall_digital", "elevator"];
  if (chip === "campus") return ["campus", "campus_board", "campus_cafe", "campus_club", "campus_library"];
  if (chip === "retail") return ["retail", "department_store", "hypermarket", "convenience", "cinema"];
  if (chip === "local") return ["local", "neighborhood_board", "local_paper", "community_board"];
  return [];
}

export function mediaMatchesCategorySlugs(
  mediaCategories: string[] | undefined,
  slugs: string[],
): boolean {
  if (slugs.length === 0) return true;
  if (!mediaCategories?.length) return false;
  const set = new Set(mediaCategories);
  return slugs.some((s) => set.has(s) || [...set].some((c) => c.includes(s)));
}

export function mediaMatchesTargetSlugs(
  targetCategories: string[] | undefined,
  slugs: string[],
): boolean {
  if (slugs.length === 0) return true;
  if (!targetCategories?.length) return false;
  const set = new Set(targetCategories);
  return slugs.some((s) => set.has(s));
}

/** Rule-based auto classification from legacy fields */
export function inferMediaCategoriesFromText(input: {
  name?: string;
  type?: string;
  subCategory?: string;
  tags?: string[];
  location?: string;
  description?: string;
}): string[] {
  const hay = [
    input.name,
    input.type,
    input.subCategory,
    input.location,
    input.description,
    ...(input.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const out = new Set<string>();

  const rules: [RegExp, string[]][] = [
    [/지하철|subway|역사|역세권|스크린도어|platform/i, ["transit", "subway", "subway_station"]],
    [/차내|in-car|in car/i, ["transit", "subway_incar"]],
    [/버스|bus|brt/i, ["transit", "bus"]],
    [/쉘터|shelter/i, ["transit", "bus_shelter", "facility", "shelter"]],
    [/택시|taxi/i, ["transit", "taxi"]],
    [/공항|airport|ktx|항만|terminal/i, ["transit", "airport_rail"]],
    [/미디어폴|media pole|mediapole/i, ["dooh", "media_pole"]],
    [/빌보드|billboard|전광|led|led/i, ["billboard", "roadside_billboard"]],
    [/빌딩|facade|외벽|artwall|아트월/i, ["billboard", "building_facade"]],
    [/옥상|rooftop/i, ["billboard", "rooftop_led"]],
    [/고가|교각|overpass|gantry/i, ["billboard", "overpass"]],
    [/dooh|디지털|digital|사이니지|signage/i, ["dooh"]],
    [/쇼핑|mall|백화|department|mart|마트/i, ["retail"]],
    [/편의점|convenience|c-store/i, ["retail", "convenience"]],
    [/영화|cinema|극장/i, ["retail", "cinema"]],
    [/대학|campus|캠퍼스|학교/i, ["campus"]],
    [/엘리베이터|elevator/i, ["dooh", "elevator"]],
    [/동네|지역|local|community/i, ["local"]],
  ];

  for (const [re, cats] of rules) {
    if (re.test(hay)) cats.forEach((c) => out.add(c));
  }

  if (input.type === "mobile" || input.type === "subway") {
    out.add("transit");
    out.add("subway");
  }
  if (input.type === "digital") out.add("dooh");
  if (input.type === "static" || input.type === "billboard") out.add("billboard");

  if (out.size === 0) out.add("billboard");

  return [...out];
}

export function inferTargetCategoriesFromText(input: {
  name?: string;
  tags?: string[];
  targetAge?: string;
  description?: string;
}): string[] {
  const hay = [input.name, input.targetAge, input.description, ...(input.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const out = new Set<string>(["brand"]);

  if (/팬|fandom|아이돌|생일|응원|k-pop|kpop/i.test(hay)) out.add("fandom");
  if (/지자체|공공|정부|보건|안전/i.test(hay)) out.add("public");
  if (/축제|문화|지역/i.test(hay)) out.add("regional");
  if (/동네|소상공|매장|오픈/i.test(hay)) out.add("small_business");
  if (/이벤트|팝업|pop-up|season/i.test(hay)) out.add("event");
  if (/시즌|seasonal|연말|명절|holiday/i.test(hay)) out.add("seasonal");
  if (/글로벌|global|international|해외|관광|tourist/i.test(hay)) out.add("global");
  if (/대학|캠퍼스|학생|20대|mz/i.test(hay)) out.add("university");

  return [...out];
}
