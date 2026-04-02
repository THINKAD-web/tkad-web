/** Shared checkbox / option keys for catalog filters (browse + quote). */

export const TARGET_TRAIT_ITEMS = [
  { key: "commute", label: "출퇴근형" },
  { key: "shopping", label: "쇼핑형" },
  { key: "leisure_night", label: "여가·야간형" },
  { key: "tourism", label: "관광형" },
  { key: "fandom", label: "팬덤·아이돌 응원형" },
] as const;

export const SPECIAL_FEATURE_ITEMS = [
  { key: "qr", label: "QR 연동" },
  { key: "data_measure", label: "데이터 측정" },
  { key: "interactive", label: "인터랙티브" },
  { key: "3d_motion", label: "3D·모션" },
  { key: "night_bright", label: "야간 조명" },
  { key: "ar", label: "AR" },
  { key: "social_share", label: "소셜 공유" },
] as const;

export const SIZE_ITEMS = [
  { key: "large", label: "대형" },
  { key: "medium", label: "중형" },
  { key: "small", label: "소형" },
] as const;

export const DURATION_ITEMS = [
  { key: "week", label: "1주 이내" },
  { key: "two_weeks", label: "2주 전후" },
  { key: "month_1_3", label: "1~3개월" },
  { key: "month_3_plus", label: "3개월 이상" },
] as const;

export const EXPOSURE_ITEMS = [
  { key: "morning", label: "오전" },
  { key: "daytime", label: "낮·주간" },
  { key: "evening", label: "저녁·야간" },
  { key: "allday", label: "24시간·상시" },
] as const;

export const INDUSTRY_ITEMS = [
  { key: "food_beverage", label: "식음료" },
  { key: "fashion_beauty", label: "패션/뷰티" },
  { key: "entertainment", label: "엔터테인먼트" },
  { key: "automotive", label: "자동차" },
  { key: "finance", label: "금융/보험" },
  { key: "tech", label: "IT/테크" },
  { key: "health", label: "의료/헬스" },
  { key: "education", label: "교육" },
  { key: "real_estate", label: "부동산" },
  { key: "lifestyle", label: "생활용품" },
] as const;
