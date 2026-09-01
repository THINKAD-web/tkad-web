import {
  LEGACY_BROWSE_MAIN_ALIASES,
  normalizeBrowseMainId,
} from "@/lib/online-browse-mains";

export type BrowseSubCategory = {
  id: string;
  label: string;
  labelEn?: string;
};

export type BrowseMainCategory = {
  id: string;
  label: string;
  labelEn?: string;
  icon: string;
  color: string;
  sub: BrowseSubCategory[];
};

export const MEDIA_CATEGORIES: BrowseMainCategory[] = [
  {
    id: "ooh",
    label: "OOH",
    labelEn: "OOH",
    icon: "Monitor",
    color: "violet",
    sub: [
      { id: "digital_signage", label: "전광판/사이니지", labelEn: "Digital signage" },
      { id: "billboard", label: "빌보드", labelEn: "Billboard" },
      { id: "wall_mural", label: "외벽광고", labelEn: "Wall mural" },
      { id: "media_pole", label: "미디어폴", labelEn: "Media pole" },
      { id: "led_screen", label: "LED 스크린", labelEn: "LED screen" },
      { id: "popup_display", label: "팝업 디스플레이", labelEn: "Popup display" },
      { id: "banner", label: "현수막/배너", labelEn: "Banner" },
    ],
  },
  {
    id: "transit",
    label: "교통 매체",
    labelEn: "Transit",
    icon: "Train",
    color: "blue",
    sub: [
      { id: "subway_station", label: "지하철 역사", labelEn: "Subway station" },
      { id: "subway_train", label: "지하철 차량", labelEn: "Subway train" },
      { id: "bus_exterior", label: "버스 외부", labelEn: "Bus exterior" },
      { id: "bus_interior", label: "버스 내부", labelEn: "Bus interior" },
      { id: "taxi_exterior", label: "택시 외부", labelEn: "Taxi exterior" },
      { id: "taxi_interior", label: "택시 내부", labelEn: "Taxi interior" },
      { id: "vehicle_wrap", label: "차량 래핑", labelEn: "Vehicle wrap" },
      { id: "airport", label: "공항", labelEn: "Airport" },
      { id: "inflight", label: "기내/항공기", labelEn: "Inflight" },
      { id: "ktx_terminal", label: "KTX/터미널", labelEn: "KTX / terminal" },
      { id: "ferry", label: "선박/항구", labelEn: "Ferry / port" },
    ],
  },
  {
    id: "shelter",
    label: "쉘터/시설물",
    labelEn: "Shelter & street",
    icon: "MapPin",
    color: "cyan",
    sub: [
      { id: "bus_shelter", label: "버스 쉘터", labelEn: "Bus shelter" },
      { id: "digital_shelter", label: "디지털 쉘터", labelEn: "Digital shelter" },
      { id: "city_furniture", label: "시설물", labelEn: "City furniture" },
      { id: "phone_booth", label: "공중전화부스", labelEn: "Phone booth" },
      { id: "trash_can", label: "쓰레기통 광고", labelEn: "Trash can ads" },
      { id: "street_furniture", label: "스트리트 퍼니처", labelEn: "Street furniture" },
    ],
  },
  {
    id: "shopping",
    label: "쇼핑",
    labelEn: "Shopping",
    icon: "ShoppingBag",
    color: "pink",
    sub: [
      { id: "mall", label: "쇼핑몰/백화점", labelEn: "Mall / department" },
      { id: "convenience", label: "편의점", labelEn: "Convenience" },
      { id: "supermarket", label: "마트/슈퍼", labelEn: "Supermarket" },
      { id: "outlet", label: "아울렛", labelEn: "Outlet" },
      { id: "market", label: "전통시장", labelEn: "Traditional market" },
      { id: "duty_free", label: "면세점", labelEn: "Duty free" },
    ],
  },
  {
    id: "entertainment",
    label: "엔터테인먼트",
    labelEn: "Entertainment",
    icon: "Music",
    color: "rose",
    sub: [
      { id: "hotplace", label: "Street/핫플레이스", labelEn: "Hot place" },
      { id: "cinema", label: "극장/영화관", labelEn: "Cinema" },
      { id: "leisure", label: "레저/스포츠", labelEn: "Leisure / sports" },
      { id: "concert", label: "공연장", labelEn: "Concert hall" },
      { id: "stadium", label: "경기장", labelEn: "Stadium" },
      { id: "tv_radio", label: "TV/라디오", labelEn: "TV / radio" },
      { id: "streaming", label: "OTT/스트리밍", labelEn: "Streaming" },
    ],
  },
  {
    id: "lifestyle",
    label: "라이프스타일",
    labelEn: "Lifestyle",
    icon: "Coffee",
    color: "amber",
    sub: [
      { id: "cafe", label: "카페", labelEn: "Cafe" },
      { id: "restaurant", label: "음식점", labelEn: "Restaurant" },
      { id: "gym", label: "헬스/피트니스", labelEn: "Gym" },
      { id: "beauty", label: "미용실/뷰티", labelEn: "Beauty" },
      { id: "laundry", label: "코인세탁소", labelEn: "Laundry" },
    ],
  },
  {
    id: "building",
    label: "건물/시설",
    labelEn: "Building",
    icon: "Building2",
    color: "emerald",
    sub: [
      { id: "elevator", label: "엘리베이터", labelEn: "Elevator" },
      { id: "office", label: "오피스빌딩", labelEn: "Office" },
      { id: "apartment", label: "아파트단지", labelEn: "Apartment" },
      { id: "hospital", label: "병원/의원", labelEn: "Hospital" },
      { id: "hotel", label: "호텔/숙박", labelEn: "Hotel" },
      { id: "parking", label: "주차장", labelEn: "Parking" },
    ],
  },
  {
    id: "education",
    label: "교육",
    labelEn: "Education",
    icon: "GraduationCap",
    color: "orange",
    sub: [
      { id: "campus", label: "대학교 캠퍼스", labelEn: "Campus" },
      { id: "school", label: "초중고", labelEn: "School" },
      { id: "academy", label: "학원가", labelEn: "Academy district" },
      { id: "library", label: "도서관", labelEn: "Library" },
    ],
  },
  {
    id: "culture",
    label: "문화/공공",
    labelEn: "Culture & public",
    icon: "Landmark",
    color: "teal",
    sub: [
      { id: "museum", label: "박물관/미술관", labelEn: "Museum" },
      { id: "park", label: "공원/광장", labelEn: "Park / plaza" },
      { id: "government", label: "관공서", labelEn: "Government" },
      { id: "religious", label: "종교시설", labelEn: "Religious" },
      { id: "community", label: "커뮤니티센터", labelEn: "Community center" },
    ],
  },
  {
    id: "search",
    label: "검색광고",
    labelEn: "Search ads",
    icon: "Search",
    color: "indigo",
    sub: [],
  },
  {
    id: "display",
    label: "디스플레이",
    labelEn: "Display",
    icon: "Monitor",
    color: "violet",
    sub: [],
  },
  {
    id: "video",
    label: "영상",
    labelEn: "Video",
    icon: "Play",
    color: "rose",
    sub: [],
  },
  {
    id: "sns",
    label: "SNS",
    labelEn: "Social",
    icon: "Share2",
    color: "pink",
    sub: [],
  },
  {
    id: "message",
    label: "메시지",
    labelEn: "Message",
    icon: "MessageSquare",
    color: "cyan",
    sub: [],
  },
  {
    id: "local",
    label: "로컬·리테일",
    labelEn: "Local & retail",
    icon: "Store",
    color: "amber",
    sub: [],
  },
  {
    id: "network",
    label: "네트워크 매체",
    labelEn: "Network",
    icon: "Network",
    color: "purple",
    sub: [
      { id: "elevator_network", label: "엘리베이터 네트워크", labelEn: "Elevator network" },
      { id: "convenience_network", label: "편의점 네트워크", labelEn: "C-store network" },
      { id: "campus_network", label: "캠퍼스 네트워크", labelEn: "Campus network" },
      { id: "hospital_network", label: "병원 네트워크", labelEn: "Hospital network" },
      { id: "parking_network", label: "주차장 네트워크", labelEn: "Parking network" },
      { id: "franchise_network", label: "프랜차이즈 네트워크", labelEn: "Franchise network" },
    ],
  },
  {
    id: "etc",
    label: "기타",
    labelEn: "Other",
    icon: "MoreHorizontal",
    color: "gray",
    sub: [{ id: "other", label: "기타", labelEn: "Other" }],
  },
];

/** Legacy subs under retired `digital` browse main (prod 0 rows). */
const LEGACY_DIGITAL_SUB_TO_MAIN: Record<string, string> = {
  social_media: "sns",
  search_ad: "search",
  display_ad: "display",
  influencer: "sns",
};

/** 레거시 `/media` type 칩 → browse main/sub */
export const LEGACY_TYPE_CHIP_TO_BROWSE: Record<
  string,
  { main: string; sub: string }
> = {
  subway: { main: "transit", sub: "subway_station" },
  bus: { main: "transit", sub: "bus_exterior" },
  billboard: { main: "ooh", sub: "billboard" },
  dooh: { main: "ooh", sub: "digital_signage" },
  campus: { main: "education", sub: "campus" },
  retail: { main: "shopping", sub: "mall" },
  bus_shelter: { main: "shelter", sub: "bus_shelter" },
  local: { main: "lifestyle", sub: "cafe" },
};

const MAIN_BY_ID = new Map(MEDIA_CATEGORIES.map((m) => [m.id, m]));

export function listMainCategories(): BrowseMainCategory[] {
  return MEDIA_CATEGORIES;
}

export function getMainCategory(id: string): BrowseMainCategory | undefined {
  return MAIN_BY_ID.get(id);
}

export function getSubCategory(
  mainId: string,
  subId: string,
): BrowseSubCategory | undefined {
  return getMainCategory(mainId)?.sub.find((s) => s.id === subId);
}

export function isValidBrowseSub(mainId: string, subId: string): boolean {
  return Boolean(getSubCategory(mainId, subId));
}

export function browseCategoryLabel(
  id: string,
  locale = "ko",
  kind: "main" | "sub" = "main",
  mainId?: string,
): string {
  const isKo = locale.startsWith("ko");
  if (kind === "main") {
    const m = getMainCategory(id);
    if (!m) return id;
    return isKo ? m.label : m.labelEn ?? m.label;
  }
  if (!mainId) return id;
  const s = getSubCategory(mainId, id);
  if (!s) return id;
  return isKo ? s.label : s.labelEn ?? s.label;
}

export function resolveBrowseCategoryParams(input: {
  mainCategory?: string | null;
  subCategory?: string | null;
  category?: string | null;
}): { mainCategory: string | null; subCategory: string | null } {
  const mainRaw = input.mainCategory?.trim() || null;
  const main = mainRaw ? normalizeBrowseMainId(mainRaw) : null;
  const sub = input.subCategory?.trim() || null;

  if (sub) {
    const fromLegacySub = LEGACY_DIGITAL_SUB_TO_MAIN[sub.toLowerCase()];
    if (fromLegacySub && getMainCategory(fromLegacySub)) {
      return { mainCategory: fromLegacySub, subCategory: null };
    }
  }

  if (main && sub && isValidBrowseSub(main, sub)) {
    return { mainCategory: main, subCategory: sub };
  }
  if (main && getMainCategory(main) && !sub) {
    return { mainCategory: main, subCategory: null };
  }

  const legacy = input.category?.trim();
  if (!legacy) return { mainCategory: main, subCategory: sub };

  const legacyMainAlias = LEGACY_BROWSE_MAIN_ALIASES[legacy.toLowerCase()];
  if (legacyMainAlias && getMainCategory(legacyMainAlias)) {
    return { mainCategory: legacyMainAlias, subCategory: null };
  }

  const legacySubMain = LEGACY_DIGITAL_SUB_TO_MAIN[legacy.toLowerCase()];
  if (legacySubMain && getMainCategory(legacySubMain)) {
    return { mainCategory: legacySubMain, subCategory: null };
  }

  const mapped = LEGACY_TYPE_CHIP_TO_BROWSE[legacy];
  if (mapped) {
    return { mainCategory: mapped.main, subCategory: mapped.sub };
  }

  for (const m of MEDIA_CATEGORIES) {
    if (m.id === legacy) return { mainCategory: m.id, subCategory: null };
    const found = m.sub.find((s) => s.id === legacy);
    if (found) return { mainCategory: m.id, subCategory: found.id };
  }

  return { mainCategory: main, subCategory: sub };
}

/** mediaCategory[] / legacy slug → browse main/sub */
export function inferBrowseCategoryFromMedia(input: {
  mediaCategory?: string[];
  subCategory?: string | null;
  type?: string;
  name?: string;
  description?: string;
  tags?: string[];
}): { main: string; sub: string } {
  for (const slug of input.mediaCategory ?? []) {
    const fromLegacy = LEGACY_TYPE_CHIP_TO_BROWSE[slug];
    if (fromLegacy) return { main: fromLegacy.main, sub: fromLegacy.sub };
    for (const m of MEDIA_CATEGORIES) {
      if (m.id === slug) {
        const first = m.sub[0];
        return { main: m.id, sub: first?.id ?? "other" };
      }
      const sub = m.sub.find((s) => s.id === slug);
      if (sub) return { main: m.id, sub: sub.id };
    }
  }

  const hay = [
    input.name,
    input.type,
    input.subCategory,
    input.description,
    ...(input.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rules: [RegExp, { main: string; sub: string }][] = [
    [/지하철|subway|역사/i, { main: "transit", sub: "subway_station" }],
    [/버스|bus/i, { main: "transit", sub: "bus_exterior" }],
    [/쉘터|shelter/i, { main: "shelter", sub: "bus_shelter" }],
    [/빌보드|billboard|전광|led|사이니지|signage|dooh/i, { main: "ooh", sub: "digital_signage" }],
    [/대학|campus|캠퍼스/i, { main: "education", sub: "campus" }],
    [/쇼핑|mall|백화|mart|마트|편의/i, { main: "shopping", sub: "mall" }],
    [/네트워크|network/i, { main: "network", sub: "franchise_network" }],
    [/엘리베이터|elevator/i, { main: "building", sub: "elevator" }],
    [/카페|cafe|동네|local/i, { main: "lifestyle", sub: "cafe" }],
  ];
  for (const [re, pair] of rules) {
    if (re.test(hay)) return pair;
  }

  if (input.type === "dooh") return { main: "ooh", sub: "digital_signage" };
  if (input.type === "static") return { main: "ooh", sub: "billboard" };
  if (input.type === "mobile") return { main: "transit", sub: "vehicle_wrap" };

  return { main: "etc", sub: "other" };
}

export function mergeBrowseIntoMediaCategory(
  existing: string[] | undefined,
  main: string,
  sub: string,
): string[] {
  const out = new Set(existing ?? []);
  out.add(main);
  out.add(sub);
  return [...out];
}
