import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Bus,
  BusFront,
  Globe2,
  GraduationCap,
  Landmark,
  MapPin,
  Mic2,
  Monitor,
  ShoppingBag,
  Smartphone,
  Store,
  TrainFront,
} from "lucide-react";

export const MEDIA_CHIP_ACTIVE =
  "tkad-neon-cta-clean text-white shadow-[0_4px_16px_rgba(124,58,237,0.25)]";

export const MEDIA_CHIP_INACTIVE =
  "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70";

type FilterChip = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export const MEDIA_TYPE_CHIPS: readonly FilterChip[] = [
  { label: "전체", value: "" },
  { label: "지하철", value: "subway", icon: TrainFront },
  { label: "버스", value: "bus", icon: Bus },
  { label: "전광판", value: "billboard", icon: Monitor },
  { label: "DOOH", value: "dooh", icon: Smartphone },
  { label: "대학가", value: "campus", icon: GraduationCap },
  { label: "쇼핑몰", value: "retail", icon: Store },
  { label: "쉘터", value: "bus_shelter", icon: BusFront },
  { label: "로컬", value: "local", icon: MapPin },
];

export const MEDIA_TARGET_CHIPS: readonly FilterChip[] = [
  { label: "전체", value: "" },
  { label: "브랜드", value: "brand", icon: Building2 },
  { label: "팬덤", value: "fandom", icon: Mic2 },
  { label: "팝업", value: "event", icon: ShoppingBag },
  { label: "동네", value: "small_business", icon: MapPin },
  { label: "대학", value: "university", icon: GraduationCap },
  { label: "지자체", value: "public", icon: Landmark },
];

/** /media/targets — 전체 목적 + 지역 프로모션 */
export const MEDIA_TARGET_PAGE_CHIPS: readonly FilterChip[] = [
  ...MEDIA_TARGET_CHIPS.filter((chip) => chip.value !== ""),
  { label: "지역", value: "regional", icon: Globe2 },
];

export const MEDIA_REGION_CHIPS = [
  { label: "전체", value: "" },
  { label: "강남", value: "강남" },
  { label: "홍대", value: "홍대" },
  { label: "성수", value: "성수" },
  { label: "도심", value: "도심" },
  { label: "부산", value: "부산" },
  { label: "대구", value: "대구" },
] as const;

export const MEDIA_SEARCH_SORT_OPTIONS = [
  { label: "인기순", value: "popular" },
  { label: "최신순", value: "newest" },
  { label: "저가순", value: "price_asc" },
  { label: "고가순", value: "price_desc" },
] as const;
