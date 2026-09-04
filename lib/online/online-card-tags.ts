/** PR5-f — short browse-card chips derived from PR5-d bestFor/strengths (static map). */
export const ONLINE_CARD_RECOMMEND_TAGS: Record<string, readonly [string, string?]> = {
  "ig-awareness-reach": ["릴스 도달", "브랜드 인지"],
  "ig-lead-gen": ["즉시 폼", "상담 DB"],
  "ig-conversion-shop": ["카탈로그", "전환"],
  "fb-traffic": ["광역 유입", "트래픽"],
  "fb-awareness": ["동영상 도달", "브랜드"],
  "yt-awareness": ["영상 스토리", "인지도"],
  "kakao-traffic": ["카톡 도달", "모바일"],
  "naver-sa-brand": ["브랜드 방어", "검색"],
  "naver-sa-conversion": ["구매 전환", "쇼핑검색"],
  "naver-sa-traffic": ["사이트 유입", "비교 키워드"],
  "google-ads-search": ["고의도 검색", "전환"],
  "google-ads-awareness": ["GDN 도달", "런칭"],
  "google-ads-lead": ["리드 폼", "B2B"],
  "tiktok-spark-awareness": ["숏폼", "Z세대"],
  "meta-advantage-plus": ["자동 입찰", "AI 쇼핑"],
  "naver-gfa-traffic": ["네이버 DA", "리타겟"],
  "naver-brand-search": ["브랜드존", "정액 고정비"],
  "kakao-moment-message": ["채팅 발송", "재구매"],
  "youtube-action": ["영상 CTA", "AI 입찰"],
  "google-pmax-conversion": ["전 지면", "AI 배분"],
  "karrot-local-traffic": ["동네 상권", "하이퍼로컬"],
  "baemin-ad-visit": ["주문 유입", "외식"],
  "coupang-ad-traffic": ["마켓 노출", "이커머스"],
  "app-uai-install": ["앱 설치", "UAI"],
  "native-taboola-traffic": ["네이티브", "콘텐츠"],
};

export function onlineCardRecommendTags(
  slug: string | undefined,
): readonly string[] {
  if (!slug) return [];
  const row = ONLINE_CARD_RECOMMEND_TAGS[slug];
  if (!row) return [];
  return row.filter((t): t is string => Boolean(t?.trim()));
}
