import type { LucideIcon } from "lucide-react";
import type { MediaCategoryIconKey } from "@/lib/media-category-icons";
import {
  Building2,
  Globe2,
  GraduationCap,
  Landmark,
  MapPin,
  Mic2,
  ShoppingBag,
  Store,
} from "lucide-react";

export const MEDIA_CHIP_ACTIVE =
  "tkad-qp-cta text-white shadow-none";

/** Option A — planner brief pattern: black primary fill, no orange */
export const MEDIA_CHIP_ACTIVE_OPTION_A =
  "bg-primary text-primary-foreground shadow-none dark:bg-primary dark:text-primary-foreground";

export const MEDIA_CHIP_INACTIVE =
  "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70";

export type MediaBrowseAccentMode = "default" | "option-a";

export function resolveMediaChipActive(mode: MediaBrowseAccentMode = "default"): string {
  return mode === "option-a" ? MEDIA_CHIP_ACTIVE_OPTION_A : MEDIA_CHIP_ACTIVE;
}

type FilterChip = {
  label: string;
  value: string;
  icon?: LucideIcon;
  categoryIcon?: MediaCategoryIconKey;
};

/**
 * 매체 유형(지하철/버스/전광판/DOOH/쉘터 등) 축 필터 칩 — SSOT.
 *
 * 현재 미사용: 지도/브라우즈 메인 화면의 유형 칩은 `MEDIA_TARGET_CHIPS`(캠페인
 * 목적 축 — 브랜드/팬덤/팝업 등)를 쓰며, 메인 칩의 Lucide 아이콘 유지는 의도된
 * 것이라 이 배열의 `categoryIcon`을 지금 끼워 넣지 않는다 (2026-09-25 디자인
 * 자산 배포 점검 결론). 두 축은 서로 다른 필터라 1:1 대응되지 않는다.
 * 추후 매체 유형 칩 UI를 별도로 노출할 때 `categoryIcon`이 이미
 * `lib/media-category-icons.ts`의 SSOT(`MediaCategoryIconKey`)를 참조하도록
 * 되어 있으니 그대로 `MediaFilterChipLabel`에 연결하면 된다.
 */
export const MEDIA_TYPE_CHIPS: readonly FilterChip[] = [
  { label: "전체", value: "" },
  { label: "지하철", value: "subway", categoryIcon: "subway" },
  { label: "버스", value: "bus", categoryIcon: "busWrap" },
  { label: "전광판", value: "billboard", categoryIcon: "billboard" },
  { label: "DOOH", value: "dooh", categoryIcon: "dooh" },
  { label: "대학가", value: "campus", icon: GraduationCap },
  { label: "쇼핑몰", value: "retail", icon: Store },
  { label: "쉘터", value: "bus_shelter", categoryIcon: "busShelter" },
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
  { label: "오늘의 인기", value: "popular" },
  { label: "최신순", value: "newest" },
  { label: "저가순", value: "price_asc" },
  { label: "고가순", value: "price_desc" },
] as const;
