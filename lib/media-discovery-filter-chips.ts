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

/** UI 지역 칩 → DB 텍스트 필드 검색용 동의어 (홍대: location·마포구 등) */
export const MEDIA_REGION_CHIP_ALIASES: Record<string, readonly string[]> = {
  강남: ["강남", "gangnam", "테헤란", "역삼", "논현", "신사", "청담", "강남구"],
  홍대: [
    "홍대",
    "hongdae",
    "홍익",
    "홍대입구",
    "합정",
    "상수",
    "연남",
    "망원",
    "마포",
  ],
  성수: ["성수", "seongsu", "성동", "연무장", "성수동"],
  도심: ["도심", "명동", "광화문", "종로", "을지로", "시청", "세종대로", "중구"],
  부산: ["부산", "busan", "해운대", "서면", "남포", "부산광역시"],
  대구: ["대구", "daegu", "동성로", "대구광역시"],
};

export function expandMediaRegionChip(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const aliases = MEDIA_REGION_CHIP_ALIASES[trimmed];
  return aliases ? [...aliases] : [trimmed];
}

export const MEDIA_SEARCH_SORT_OPTIONS = [
  { label: "인기순", value: "popular" },
  { label: "최신순", value: "newest" },
  { label: "저가순", value: "price_asc" },
  { label: "고가순", value: "price_desc" },
] as const;
