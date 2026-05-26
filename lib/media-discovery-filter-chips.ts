export const MEDIA_CHIP_ACTIVE =
  "tkad-neon-cta-clean text-white shadow-[0_4px_16px_rgba(124,58,237,0.25)]";

export const MEDIA_CHIP_INACTIVE =
  "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70";

export const MEDIA_TYPE_CHIPS = [
  { label: "전체", value: "", icon: "" },
  { label: "지하철", value: "subway", icon: "🚇" },
  { label: "버스", value: "bus", icon: "🚌" },
  { label: "전광판", value: "billboard", icon: "📺" },
  { label: "DOOH", value: "dooh", icon: "💡" },
  { label: "대학가", value: "campus", icon: "🎓" },
  { label: "쇼핑몰", value: "retail", icon: "🏬" },
  { label: "쉘터", value: "bus_shelter", icon: "🚏" },
  { label: "로컬", value: "local", icon: "🏘" },
] as const;

export const MEDIA_TARGET_CHIPS = [
  { label: "전체", value: "", icon: "" },
  { label: "브랜드", value: "brand", icon: "🏢" },
  { label: "팬덤", value: "fandom", icon: "🎤" },
  { label: "팝업", value: "event", icon: "🛍" },
  { label: "동네", value: "small_business", icon: "🏘" },
  { label: "대학", value: "university", icon: "🎓" },
  { label: "지자체", value: "public", icon: "🏛" },
] as const;

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
