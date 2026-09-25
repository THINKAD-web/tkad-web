/** 2차 디자인 배치 — 온보딩·OG·마케팅 히어로 PNG 경로 SSOT */

export const DESIGN_ONBOARDING_ASSETS = {
  mapSteps: "/assets/onboarding/onboarding-steps.png",
} as const;

export const DESIGN_OG_ASSETS = {
  // 연결 해제: 콘텐츠 사실관계 불일치, 디자인 수정본 대기
  // (이미지 속 기능 목록이 실제 /pricing 플랜과 다름 — OG는 코드 생성 opengraph-image.tsx 로 원복)
  pricing: "/assets/og/og-pricing.png",
} as const;

export const DESIGN_MARKETING_HERO_ASSETS = {
  /**
   * 요금제 — "OOH, 이제 투명하게"
   * 연결 해제: 콘텐츠 사실관계 불일치, 디자인 수정본 대기
   * (이미지 속 요금제 비교가 실제 /pricing 기능과 다르고 AGENCY·ENTERPRISE 누락)
   */
  pricingTransparent: "/assets/hero/preview.png",
  /** 플래너 — AI 매체 믹스 */
  plannerAiMix: "/assets/hero/preview-2.png",
  /**
   * 성공 사례 쇼케이스
   * 연결 해제: 콘텐츠 사실관계 불일치, 디자인 수정본 대기
   * ("실제 집행 사례" 문구 + 실존 브랜드명 합성 — 사례 예시 표기 원칙과 충돌)
   */
  casesShowcase: "/assets/hero/preview-3.png",
  /**
   * 회사 소개 / 브랜드 스토리
   * 수치 불일치: 이미지에 "870+ 검증 매체"가 박혀 있으나 /about 본문은
   * `getPublicMediaCountLabel()`(DB 동적, prod 기준 "830+")을 쓴다. "한국·미국·일본" 중
   * 일본 근거 확인 필요 — 연결 유지, 수치 SSOT 확정 후 디자인 수정 요청.
   */
  brandStory: "/assets/hero/preview-4.png",
} as const;
