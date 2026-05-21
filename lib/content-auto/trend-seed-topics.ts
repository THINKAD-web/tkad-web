/** 초기 트렌드 리포트 시드 주제 (어드민 검수 후 발행). */
export type TrendSeedTopic = {
  slug: string;
  titleKo: string;
  topicFocus: string;
};

export const TREND_SEED_TOPICS: readonly TrendSeedTopic[] = [
  {
    slug: "trend-2026-korea-ooh-outlook",
    titleKo: "2026년 한국 OOH 시장 전망 — 디지털 전환과 데이터 통합",
    topicFocus:
      "2026년 한국 옥외광고 시장 규모, DOOH 성장, 데이터·프로그래매틱 통합, 규제·측정 트렌드",
  },
  {
    slug: "trend-2026-hotspot-mz-media",
    titleKo: "강남·홍대·성수 — MZ 타겟 핫스팟 매체 분석",
    topicFocus:
      "서울 강남·홍대·성수 권역 OOH·DOOH 매체 믹스, MZ 타겟 도달, 시간대·상권별 집행 전략",
  },
  {
    slug: "trend-dooh-vs-static-billboard",
    titleKo: "DOOH vs 고정형 빌보드 — 업종별 효과 비교",
    topicFocus:
      "디지털 옥외(DOOH)와 고정형 빌보드·패널 비교, 목표별(인지·전환) 추천, 비용·측정·크리에이티브 차이",
  },
  {
    slug: "trend-kcontent-ooh-synergy",
    titleKo: "K-콘텐츠 글로벌 붐과 한국 OOH 광고의 기회",
    topicFocus:
      "K-콘텐츠·엔터테인먼트 마케팅과 OOH 연계 사례, 팬덤·이벤트 연동, IP·캐릭터 옥외 집행",
  },
  {
    slug: "trend-esg-ooh-green-media",
    titleKo: "ESG 시대 친환경 옥외광고 트렌드와 사례",
    topicFocus:
      "ESG·친환경 옥외광고, 저전력 DOOH, 재활용 소재·에너지 효율 매체, 브랜드 메시지와 규제",
  },
] as const;
