/**
 * 지역 long-form 가이드 데이터 (`/guides/[slug]`).
 *
 * **편집 정책**:
 *   - AI 자동 생성 X — 모든 콘텐츠는 편집자 / 마케터가 수기로 작성·검수
 *   - 새 가이드 추가 시 PR 로 항목 추가 (코드 리뷰 + 운영 검증)
 *   - placeholder 콘텐츠는 명확히 표기 ("draft: true")
 *
 * **가이드 구조**:
 *   - title: 검색 친화 제목 (key phrase 포함)
 *   - description: meta description / hero subtitle 겸용
 *   - sections: 본문 헤더+문단 시퀀스 (Markdown X — 단순 구조로 운영 안전)
 *   - faqs: 페이지 하단 FAQ (FAQPage JSON-LD 후보)
 *   - relatedRegion / relatedTypes: 관련 키워드 랜딩으로 내부 링크
 *
 * server / client 양쪽 import 가능.
 */

export type GuideSection = {
  /** 헤더 (h2) — 짧게, 키워드 포함 권장 */
  heading: string;
  /** 본문 단락. 빈 배열이면 헤더만 출력 */
  paragraphs: string[];
  /** 옵션: 단락 뒤에 표시되는 bullet 목록 */
  bullets?: string[];
};

export type GuideFaqItem = {
  question: string;
  answer: string;
};

export type Guide = {
  /** URL slug (영문 권장 — 한글도 허용되지만 SEO 측면에서 영문 단어가 안정적) */
  slug: string;
  /** 검색 친화 제목 (60자 이내 권장) */
  title: string;
  /** meta description / hero subtitle 겸용 (160자 이내 권장) */
  description: string;
  /** 발행일 (ISO 8601) */
  publishedAt: string;
  /** 마지막 갱신일 — 없으면 publishedAt 사용 */
  updatedAt?: string;
  /** 검색용 keywords (메타 태그) */
  keywords: string[];
  /** 본문 섹션 시퀀스 */
  sections: GuideSection[];
  /** 페이지 하단 FAQ (FAQPage JSON-LD 자동 출력) */
  faqs?: GuideFaqItem[];
  /** /media/region/[region] 으로 내부 링크 — 카드 표시 */
  relatedRegion?: string;
  /** /media/type/[type] 으로 내부 링크 */
  relatedTypes?: string[];
  /** /media/area/[area] 로 내부 링크 (한글) */
  relatedAreas?: string[];
  /** placeholder 가이드 표시 — true 면 페이지 상단에 "초안" 배너 */
  draft?: boolean;
};

/**
 * 가이드 목록.
 *
 * 추가 절차:
 *   1) 편집자가 콘텐츠 초안 작성 (AI 보조 가능, 사람 검수 필수)
 *   2) PR 로 항목 추가 + 운영 보호 정책 (광고주 발송 산출물에 영향 없는지) 확인
 *   3) draft: true 로 머지 → 검수 후 draft: false 로 공개
 *
 * 첫 가이드 (강남) 는 framework 데모용 placeholder. 마케팅 팀이 본문 채워넣음.
 */
export const GUIDES: Guide[] = [
  {
    slug: "gangnam-ooh-guide",
    title: "강남 옥외광고 완벽 가이드 — 매체 선정부터 집행까지",
    description:
      "서울 강남구에서 OOH 광고를 집행하는 광고주를 위한 가이드. 핵심 매체 위치, 유동인구 분석, 예산 가이드, 매체 선정 체크리스트.",
    publishedAt: "2026-04-28T00:00:00+09:00",
    keywords: [
      "강남 옥외광고",
      "강남 OOH",
      "강남구 빌보드",
      "강남역 광고",
      "테헤란로 디지털 사이니지",
      "선릉 매체",
      "삼성역 광고",
      "코엑스 전광판",
      "THINKAD",
      "싱커드",
    ],
    sections: [
      {
        heading: "강남 OOH 광고가 효과적인 이유",
        paragraphs: [
          "[편집자 작성 영역] 강남 지역의 유동인구 특성, 비즈니스 밀집도, 타깃 인구통계 등을 작성합니다. THINKAD 검증 매체 데이터와 연계해 강남구 일평균 유동, 주요 상권의 시인성 점수 등을 포함하세요.",
          "이 가이드는 framework 데모입니다. 마케팅 / 편집자 검수 후 본문이 채워집니다.",
        ],
      },
      {
        heading: "강남 핵심 매체 위치 5선",
        paragraphs: [
          "[편집자 작성 영역] 강남대로, 테헤란로, 강남역 사거리, 코엑스 일대, 선릉역 등 핵심 매체 위치를 소개합니다. 각 위치의 특성과 적합한 캠페인 유형을 설명하세요.",
        ],
        bullets: [
          "강남대로 — 주요 디지털 사이니지 / 빌보드 밀집",
          "테헤란로 — 디지털 사이니지 + IT 비즈니스 타깃",
          "코엑스 일대 — LED 전광판 + 쇼핑몰 내 디지털",
          "선릉역 — 출퇴근 동선 + 지하철 광고",
          "강남역 사거리 — 최대 유동인구",
        ],
      },
      {
        heading: "강남 OOH 캠페인 예산 가이드",
        paragraphs: [
          "[편집자 작성 영역] 강남 지역의 매체별 단가 범위 (월 단위), 추천 예산 구간 (스타트업 / 중소 / 대형 캠페인) 을 정리합니다. THINKAD 의 견적 데이터를 활용하세요.",
        ],
      },
      {
        heading: "체크리스트 — 강남 매체 선정 시 확인할 5가지",
        paragraphs: [
          "[편집자 작성 영역] 매체 선정 시 광고주가 확인해야 할 항목을 체크리스트로 정리합니다.",
        ],
        bullets: [
          "타깃 인구통계 (직장인 vs 학생 vs 관광객)",
          "매체 시인성 점수 (THINKAD 검증)",
          "주변 광고 노이즈 (경쟁 매체 밀집도)",
          "최소 집행 기간 (월 단위 vs 단기)",
          "측정 방법 (QR 트래킹 / 매장 방문 / 브랜드 인지)",
        ],
      },
    ],
    faqs: [
      {
        question: "강남에서 가장 효과적인 OOH 매체는?",
        answer:
          "[편집자 작성] 캠페인 목표에 따라 다릅니다. 브랜드 인지 캠페인은 코엑스 LED 전광판이나 강남대로 빌보드, 행동 유도(전환) 캠페인은 강남역 지하철 광고나 디지털 사이니지가 효과적입니다.",
      },
      {
        question: "강남 OOH 광고비는 얼마인가요?",
        answer:
          "[편집자 작성] 매체 종류 / 위치 / 기간에 따라 다릅니다. 일반 빌보드 월 500만원~, LED 전광판 월 1,500만원~, 지하철 광고는 노출량 기반으로 단가가 결정됩니다. 정확한 견적은 무료 상담을 이용하세요.",
      },
    ],
    relatedRegion: "seoul",
    relatedTypes: ["digital", "static"],
    relatedAreas: ["강남구"],
    draft: true,
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

/** 검색 / 목록용 가이드 메타 (전체 콘텐츠 제외 — 페이로드 절약). */
export function listGuideMeta() {
  return GUIDES.map((g) => ({
    slug: g.slug,
    title: g.title,
    description: g.description,
    publishedAt: g.publishedAt,
    updatedAt: g.updatedAt ?? g.publishedAt,
    draft: g.draft ?? false,
    relatedRegion: g.relatedRegion,
    relatedAreas: g.relatedAreas,
  }));
}
