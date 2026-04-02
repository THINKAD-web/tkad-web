/**
 * /media 정밀 필터 전용 옵션 (키 → 한글 라벨).
 * 필터링은 `media-precision-filter-match.ts`의 패턴과 함께 사용합니다.
 */

export const PRECISION_AREA_SPOTS = [
  { key: "seongsu", label: "성수" },
  { key: "seongsu_dong", label: "성수동" },
  { key: "gangnam", label: "강남" },
  { key: "dosan", label: "도산대로" },
  { key: "hongdae", label: "홍대" },
  { key: "coex", label: "코엑스" },
  { key: "sinnonhyeon", label: "신논현" },
  { key: "apgujeong", label: "압구정" },
  { key: "samsung_dong", label: "삼성동" },
  { key: "yeouido", label: "여의도" },
  { key: "gwanghwamun", label: "광화문" },
] as const;

export const PRECISION_MEDIA_FORMATS = [
  { key: "billboard_led", label: "전광판" },
  { key: "billboard", label: "빌보드" },
  { key: "facade", label: "외벽" },
  { key: "wrapping", label: "랩핑" },
  { key: "mediapole", label: "미디어폴" },
  { key: "cube", label: "Cube" },
  { key: "shelter", label: "쉘터" },
  { key: "taxi", label: "택시" },
] as const;

export const PRECISION_TARGET_PERSONAS = [
  { key: "mz", label: "MZ세대" },
  { key: "age_2030", label: "2030" },
  { key: "kpop_fandom", label: "K-POP 팬덤" },
  { key: "hot_place_visitor", label: "핫플레이스 방문자" },
  { key: "affluent_young", label: "구매력 높은 젊은층" },
] as const;

export const PRECISION_INDUSTRY_TAGS = [
  { key: "fashion_beauty", label: "패션·뷰티" },
  { key: "fnb", label: "식음료" },
  { key: "entertainment_kpop", label: "엔터·K-POP" },
  { key: "auto_tech", label: "자동차·테크" },
  { key: "finance_realestate", label: "금융·부동산" },
  { key: "retail", label: "리테일" },
  { key: "government", label: "지자체" },
  { key: "institution", label: "기관" },
] as const;

export const PRECISION_CAMPAIGN_PURPOSES = [
  { key: "fan_support", label: "팬클럽·응원광고" },
  { key: "brand_campaign", label: "브랜드 캠페인" },
  { key: "product_launch", label: "신제품 론칭" },
  { key: "event_promo", label: "이벤트 프로모션" },
] as const;

export const PRECISION_DURATION_ITEMS = [
  { key: "week", label: "1주 이내" },
  { key: "two_to_four_weeks", label: "2~4주" },
  { key: "month_1_3", label: "1~3개월" },
  { key: "month_3_plus", label: "3개월 이상" },
] as const;

export const PRECISION_SPECIAL_FEATURES = [
  { key: "qr", label: "QR 연동" },
  { key: "interactive", label: "인터랙티브" },
  { key: "3d_motion", label: "3D/모션" },
  { key: "ar", label: "AR 연동" },
  { key: "night_bright", label: "야간 조명 강조" },
] as const;

/** 만원/월 — 정밀 필터 슬라이더 범위 */
export const PRECISION_BUDGET_MIN_MAN = 100;
export const PRECISION_BUDGET_MAX_MAN = 15_000;

/** /media 그리드·카탈로그 최소 노출 권장 건수 */
export const MEDIA_BROWSE_GRID_MIN_ITEMS = 15;

export type PrecisionAreaSpotKey = (typeof PRECISION_AREA_SPOTS)[number]["key"];
export type PrecisionMediaFormatKey = (typeof PRECISION_MEDIA_FORMATS)[number]["key"];
export type PrecisionTargetPersonaKey =
  (typeof PRECISION_TARGET_PERSONAS)[number]["key"];
export type PrecisionIndustryTagKey =
  (typeof PRECISION_INDUSTRY_TAGS)[number]["key"];
export type PrecisionCampaignPurposeKey =
  (typeof PRECISION_CAMPAIGN_PURPOSES)[number]["key"];
