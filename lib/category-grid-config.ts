/** 홈·매체 탐색용 카테고리 버튼 그리드 정의 */

import type { CategoryIconName } from "@/lib/category-icons";

export type CategoryGridItem = {
  slug: string;
  iconName: CategoryIconName;
  labelKo: string;
  labelEn: string;
  href: string;
  /** 활성 매칭용 (URL param 등) */
  matchSlug?: string;
};

export const HOME_MEDIA_TYPE_GRID: CategoryGridItem[] = [
  {
    slug: "subway",
    iconName: "Train",
    labelKo: "지하철",
    labelEn: "Subway",
    href: "/media?category=subway",
  },
  {
    slug: "bus",
    iconName: "Bus",
    labelKo: "버스",
    labelEn: "Bus",
    href: "/media?category=bus",
  },
  {
    slug: "billboard",
    iconName: "Monitor",
    labelKo: "전광판",
    labelEn: "Billboard",
    href: "/media?category=billboard",
  },
  {
    slug: "dooh",
    iconName: "Tv2",
    labelKo: "DOOH",
    labelEn: "DOOH",
    href: "/media?category=dooh",
  },
  {
    slug: "campus",
    iconName: "GraduationCap",
    labelKo: "대학가",
    labelEn: "Campus",
    href: "/media?category=campus",
  },
  {
    slug: "retail",
    iconName: "ShoppingBag",
    labelKo: "쇼핑몰",
    labelEn: "Mall",
    href: "/media?category=retail",
  },
  {
    slug: "bus_shelter",
    iconName: "MapPin",
    labelKo: "쉘터",
    labelEn: "Shelter",
    href: "/media?category=bus_shelter",
  },
  {
    slug: "local",
    iconName: "Home",
    labelKo: "로컬",
    labelEn: "Local",
    href: "/media?category=local",
  },
];

export const HOME_TARGET_GRID: CategoryGridItem[] = [
  {
    slug: "brand",
    iconName: "Building2",
    labelKo: "기업 브랜드",
    labelEn: "Brand",
    href: "/media?target=brand",
  },
  {
    slug: "fandom",
    iconName: "Heart",
    labelKo: "팬덤",
    labelEn: "Fandom",
    href: "/media?target=fandom",
  },
  {
    slug: "event",
    iconName: "Sparkles",
    labelKo: "팝업·이벤트",
    labelEn: "Pop-up",
    href: "/media?target=event",
  },
  {
    slug: "small_business",
    iconName: "MapPin",
    labelKo: "동네",
    labelEn: "Local",
    href: "/media?target=small_business",
  },
  {
    slug: "university",
    iconName: "BookOpen",
    labelKo: "대학 캠퍼스",
    labelEn: "University",
    href: "/media?target=university",
  },
  {
    slug: "public",
    iconName: "Landmark",
    labelKo: "지자체",
    labelEn: "Public",
    href: "/media?target=public",
  },
  {
    slug: "seasonal",
    iconName: "Calendar",
    labelKo: "시즌",
    labelEn: "Seasonal",
    href: "/media?target=seasonal",
    matchSlug: "seasonal",
  },
  {
    slug: "global",
    iconName: "Globe",
    labelKo: "글로벌",
    labelEn: "Global",
    href: "/media?target=global",
    matchSlug: "global",
  },
];
