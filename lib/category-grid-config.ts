/** 홈·매체 탐색용 카테고리 버튼 그리드 정의 */

export type CategoryGridItem = {
  slug: string;
  icon: string;
  labelKo: string;
  labelEn: string;
  href: string;
  /** 활성 매칭용 (URL param 등) */
  matchSlug?: string;
};

export const HOME_MEDIA_TYPE_GRID: CategoryGridItem[] = [
  { slug: "subway", icon: "🚇", labelKo: "지하철", labelEn: "Subway", href: "/media/category/subway" },
  { slug: "bus", icon: "🚌", labelKo: "버스", labelEn: "Bus", href: "/media/category/bus" },
  { slug: "billboard", icon: "📺", labelKo: "전광판", labelEn: "Billboard", href: "/media/category/billboard" },
  { slug: "dooh", icon: "💡", labelKo: "DOOH", labelEn: "DOOH", href: "/media/category/dooh" },
  { slug: "campus", icon: "🎓", labelKo: "대학가", labelEn: "Campus", href: "/media/category/campus" },
  { slug: "retail", icon: "🛍", labelKo: "쇼핑몰", labelEn: "Mall", href: "/media/category/retail" },
  {
    slug: "convenience",
    icon: "🏪",
    labelKo: "카페·편의점",
    labelEn: "Café & C-store",
    href: "/media/category/convenience",
  },
  {
    slug: "bus_shelter",
    icon: "🚏",
    labelKo: "쉘터",
    labelEn: "Shelter",
    href: "/media/category/bus_shelter",
  },
];

export const HOME_TARGET_GRID: CategoryGridItem[] = [
  { slug: "brand", icon: "🏢", labelKo: "기업 브랜드", labelEn: "Brand", href: "/target/brand" },
  { slug: "fandom", icon: "🎤", labelKo: "팬덤", labelEn: "Fandom", href: "/special/fandom" },
  { slug: "event", icon: "🎉", labelKo: "팝업·이벤트", labelEn: "Pop-up", href: "/target/event" },
  {
    slug: "small_business",
    icon: "🏘",
    labelKo: "동네",
    labelEn: "Local",
    href: "/target/small_business",
  },
  {
    slug: "university",
    icon: "🎓",
    labelKo: "대학 캠퍼스",
    labelEn: "University",
    href: "/target/university",
  },
  { slug: "public", icon: "🏛", labelKo: "지자체", labelEn: "Public", href: "/target/public" },
  {
    slug: "seasonal",
    icon: "🌸",
    labelKo: "시즌",
    labelEn: "Seasonal",
    href: "/target/event",
    matchSlug: "event",
  },
  {
    slug: "global",
    icon: "🌐",
    labelKo: "글로벌",
    labelEn: "Global",
    href: "/target/brand",
    matchSlug: "brand",
  },
];

/** 홈 가로 스크롤 칩 — 대표 4개씩 */
export const HOME_MEDIA_TYPE_CHIPS: CategoryGridItem[] = [
  HOME_MEDIA_TYPE_GRID[0]!,
  HOME_MEDIA_TYPE_GRID[2]!,
  HOME_MEDIA_TYPE_GRID[4]!,
  HOME_MEDIA_TYPE_GRID[3]!,
];

export const HOME_TARGET_CHIPS: CategoryGridItem[] = [
  HOME_TARGET_GRID[1]!,
  HOME_TARGET_GRID[2]!,
  HOME_TARGET_GRID[3]!,
  HOME_TARGET_GRID[0]!,
];
