import type { ReportCategory } from "@prisma/client";

export type ReportSeedTopic = {
  slug: string;
  title: string;
  category: ReportCategory;
  keywords: string[];
};

export const REPORT_SEED_TOPICS: readonly ReportSeedTopic[] = [
  {
    slug: "trend-2026-korea-ooh-outlook",
    title: "2026년 한국 OOH 시장 전망 — 디지털 전환과 데이터 통합",
    category: "TREND",
    keywords: ["DOOH", "데이터", "프로그래매틱", "OOH 시장"],
  },
  {
    slug: "trend-hotspot-gangnam-hongdae-seongsu",
    title: "강남·홍대·성수 핫스팟 OOH 매체 완전 분석",
    category: "REGION",
    keywords: ["강남", "홍대", "성수", "핫플레이스", "MZ"],
  },
  {
    slug: "trend-dooh-vs-static-billboard-guide",
    title: "DOOH vs 고정형 빌보드 — 업종별 최적 선택 가이드",
    category: "GUIDE",
    keywords: ["DOOH", "빌보드", "업종별", "CPM", "효율"],
  },
  {
    slug: "trend-kcontent-global-ooh",
    title: "K-콘텐츠 글로벌 붐과 한국 OOH 광고의 기회",
    category: "TREND",
    keywords: ["K콘텐츠", "글로벌", "팬덤", "한류", "광고"],
  },
  {
    slug: "trend-ooh-campaign-3m-budget",
    title: "예산 300만원으로 시작하는 첫 OOH 캠페인 전략",
    category: "GUIDE",
    keywords: ["소예산", "첫 광고", "소상공인", "OOH 입문"],
  },
] as const;

export const REPORT_SEED_SYSTEM = `당신은 THINKAD 싱커드의 OOH 광고 전문 애널리스트입니다.
한국 OOH 광고 시장에 대한 전문적이고 실용적인 트렌드 리포트를 작성하세요.

형식:
- 핵심 요약 (3줄)
- 본문 섹션 3개 (각 h2 + 300자 이상 내용)
- 시사점 (광고주가 바로 활용할 수 있는 인사이트)
- 마지막에 자연스럽게 THINKAD 플랫폼 언급

톤: 전문적이되 읽기 쉽게, 데이터/수치 포함, 실용적`;
