import type { Report, ReportCategory } from "@prisma/client";

/** DB 미연결·빈 테이블 시 UI 검증용 샘플 (5건) */
export type DemoReport = Pick<
  Report,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "content"
  | "category"
  | "tags"
  | "thumbnail"
  | "published"
  | "publishedAt"
  | "updatedAt"
>;

const now = new Date("2026-04-01T09:00:00.000Z");

export const DEMO_REPORTS: DemoReport[] = [
  {
    id: "demo-ooh-trend-2026",
    slug: "ooh-trend-2026",
    title: "2026년 주목할 OOH 광고 트렌드 5가지",
    category: "TREND" as ReportCategory,
    tags: ["월간리포트", "DOOH", "트렌드"],
    summary:
      "DOOH 확산, 데이터 기반 매체 선택, 크리에이티브 자동화 등 주목할 변화를 정리했습니다.",
    content: `## 1. DOOH와 프로그래매틱

디지털 옥외는 이제 선택이 아니라 기본 전제에 가깝습니다.

### 왜 지금인가

송출·재고가 API로 연결되면서 캠페인 운영 속도가 빨라집니다.

## 2. 데이터 기반 매체 선정

노출수만이 아닌 오디언스·동선·상권 데이터가 견적과 기획의 중심에 섭니다.

## 3. 크리에이티브 자동화

소재 제작·검수 파이프라인이 자동화되며, 동적 소재 전환이 쉬워집니다.

## 4. 브랜드 세이프티

UGC·리스크 필터링과 송출 전 검수가 운영 필수 항목입니다.

## 5. 통합 리포팅

캠페인 KPI를 웹 대시보드로 공유하는 흐름이 가속화됩니다.`,
    thumbnail: null,
    published: true,
    publishedAt: now,
    updatedAt: now,
  },
  {
    id: "demo-media-gangnam-tower",
    slug: "new-media-gangnam-tower-q2",
    title: "[신규 매체] 강남역 프리미엄 타워 전광판 오픈",
    category: "MEDIA" as ReportCategory,
    tags: ["신규매체", "강남", "DOOH"],
    summary:
      "싱커드 네트워크에 강남역 인근 초고해상도 전광판이 추가됐습니다. 스펙·가용 일정·추천 업종을 안내합니다.",
    content: `## 매체 개요

강남역 2번 출구 인근, 지상 40m급 LED 타워가 2026년 4월부터 집행 가능합니다.

## 스펙

- 해상도: 4K 세로형
- 일 평균 유동: 약 28만 명 (추정)
- 최소 집행: 2주

## 추천 업종

뷰티·F&B·테크 론칭 캠페인에 적합합니다. 야간 가시성이 높아 프리미엄 브랜드 메시지에 강합니다.

## 문의

매체 상세·실시간 가용은 THINKAD 플래너 또는 견적 문의를 이용해 주세요.`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-03-28T10:00:00.000Z"),
    updatedAt: now,
  },
  {
    id: "demo-industry-fnb",
    slug: "industry-fnb-ooh-playbook",
    title: "F&B 업종 OOH 집행 인사이트 — 상권 × 메뉴 타이밍",
    category: "GUIDE" as ReportCategory,
    tags: ["업종", "F&B", "집행팁"],
    summary:
      "외식·카페 브랜드가 옥외에서 런칭·프로모션할 때 자주 쓰는 매체 믹스와 메시지 타이밍을 정리했습니다.",
    content: `## F&B가 OOH에서 이기는 순간

메뉴·매장 위치가 명확할 때, 옥외는 검색 전 인지를 만듭니다.

## 상권별 포맷

### 오피스 상권

점심·퇴근 시간대 DOOH, 역사 인근 미디어폴.

### 주거·상업 복합

버스쉘터·생활권 패널로 반복 노출.

## 크리에이티브

한 장면·한 메뉴·한 CTA. QR은 랜딩 속도를 먼저 확인하세요.

## 예산 밴드

월 500만~3,000만 원 구간에서 믹스 3~5개가 일반적입니다.`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-03-15T08:00:00.000Z"),
    updatedAt: now,
  },
  {
    id: "demo-campaign-beauty",
    slug: "campaign-success-beauty-q1",
    title: "성공 사례: 뷰티 브랜드 성수 팝업 — OOH + 검색 연동",
    category: "CAMPAIGN" as ReportCategory,
    tags: ["성공사례", "뷰티", "성수"],
    summary:
      "한정 팝업 스토어를 옥외로 예고하고 검색·SNS 전환을 끌어올린 3주 캠페인 요약입니다.",
    content: `## 캠페인 목표

팝업 오픈 전 2주간 '성수 + 브랜드명' 검색량을 키우는 것.

## 매체 믹스

성수 일대 패널 4면 + 인근 DOOH 1면. 총 예산 약 2,400만 원.

## 결과 (내부 추정)

- 검색량 전주 대비 +38%
- 팝업 첫 주말 대기 발생
- UGC 해시태그 1,200건+

## 교훈

옥외 카피에 날짜·장소를 크게. 동일 상권 내 중복 노출보다 동선 교차 배치가 유리했습니다.`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-03-01T12:00:00.000Z"),
    updatedAt: now,
  },
  {
    id: "demo-region-seongsu",
    slug: "seongsu-hannam-ooh-2026",
    title: "성수·한남 상권 OOH 매체 현황 분석",
    category: "REGION" as ReportCategory,
    tags: ["지역", "성수", "한남"],
    summary:
      "서울 핵심 상권의 옥외광고 매체 분포와 단가 현황을 현장 데이터 기반으로 분석했습니다.",
    content: `## 상권 개요

성수·한남 일대는 유동 인구와 체류 시간이 모두 높습니다.

## 매체 믹스

대형 전광판·미디어폴·버스쉘터 등이 다층적으로 분포합니다.

## 단가·가용성

시즌·패키지에 따라 변동폭이 큽니다.

## 실행 체크포인트

제작물 규격, 전기·구조 안전, 송출 스케줄을 사전 확정하세요.`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-02-20T09:00:00.000Z"),
    updatedAt: now,
  },
];

export function listDemoReports(opts: {
  category?: ReportCategory | null;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);
  let rows = [...DEMO_REPORTS].sort(
    (a, b) =>
      (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  if (opts.category) {
    rows = rows.filter((r) => r.category === opts.category);
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    reports: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export function getDemoReportBySlug(slug: string): DemoReport | null {
  return DEMO_REPORTS.find((r) => r.slug === slug) ?? null;
}
