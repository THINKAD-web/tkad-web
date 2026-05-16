import type { AcademyArticle, AcademyArticleCategory } from "@prisma/client";

export type DemoAcademyArticle = Pick<
  AcademyArticle,
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

const now = new Date("2026-04-10T09:00:00.000Z");

export const DEMO_ACADEMY_ARTICLES: DemoAcademyArticle[] = [
  {
    id: "demo-what-is-ooh",
    slug: "what-is-ooh",
    title: "옥외광고(OOH)란? — 디지털 광고와 다른 점",
    category: "BASICS" as AcademyArticleCategory,
    tags: ["기초", "OOH", "입문"],
    summary:
      "옥외광고의 정의, 주요 매체 유형, 디지털 광고와의 차이를 초보 광고주 관점에서 정리했습니다.",
    content: `## 옥외광고란

Out-of-Home(OOH)은 이동·생활 동선에서 접하는 모든 옥외 매체를 말합니다. 빌보드, 버스·지하철, 전광판, 엘리베이터 등이 대표적입니다.

## 디지털 광고와 무엇이 다른가

- **물리적 존재감**: 실제 공간에서 반복 노출되어 브랜드 기억에 유리합니다.
- **지역 타기팅**: 상권·노선·동선 단위로 메시지를 맞출 수 있습니다.
- **집행 구조**: 제작·설치·철거 일정이 캠페인 설계의 핵심입니다.

## DOOH vs 고정형

DOOH(디지털 옥외)는 송출 스케줄·소재 교체가 유연하고, 고정형은 단가·인지 지속력 면에서 강점이 있습니다. 목표에 따라 믹스하는 경우가 많습니다.

## CPM 이해하기

OOH에서도 노출 기준 단가(CPM)로 매체를 비교합니다. 다만 **가시 거리·조명·체류 시간**이 실제 효과에 큰 영향을 주므로, 숫자만으로 판단하지 않는 것이 좋습니다.`,
    thumbnail: null,
    published: true,
    publishedAt: now,
    updatedAt: now,
  },
  {
    id: "demo-industry-media-types",
    slug: "industry-media-selection-guide",
    title: "업종별 추천 매체 유형 — F&B·뷰티·테크",
    category: "MEDIA_GUIDE" as AcademyArticleCategory,
    tags: ["매체선정", "업종", "가이드"],
    summary:
      "업종별로 자주 쓰는 OOH 포맷과 지역·시즌 전략을 한눈에 비교할 수 있도록 정리했습니다.",
    content: `## F&B·카페

역세권 미디어폴, 상권 버스쉘터, 야간 가시성 높은 전광판이 메뉴·매장 인지에 효과적입니다.

## 뷰티·패션

프리미엄 상권 대형 패널 + SNS 연계 DOOH로 **런칭·시즌** 메시지를 강화합니다.

## 테크·앱

대학가·IT 클러스터 + 지하철 스크린으로 **다운로드·가입** 유도와 연계하기 좋습니다.

## 지역별 특성

수도권은 노출 규모, 지방은 상대적 단가·로컬 신뢰도가 강점입니다. 전국 브랜드는 **핵심 상권 + 지역 거점** 믹스를 검토하세요.

## 시즌별 전략

성수기 전 2~4주 집중 노출 → 시즌 중 리마인드 → 시즌 말 프로모션 전환 순으로 기간을 나누면 효율이 좋아집니다.`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-03-28T09:00:00.000Z"),
    updatedAt: now,
  },
  {
    id: "demo-budget-mix-strategy",
    slug: "budget-tier-media-mix",
    title: "예산 규모별 추천 전략 — 효율적인 매체 믹스",
    category: "BUDGET" as AcademyArticleCategory,
    tags: ["예산", "믹스", "전략"],
    summary:
      "1천만·3천만·1억 원대 예산에서 자주 쓰는 매체 조합과 우선순위를 정리했습니다.",
    content: `## 1천만 원 이하

단일 고가 매체보다 **중소형 3~5개 믹스**가 리치 대비 효율이 나은 경우가 많습니다. KPI를 하나(인지 vs 유입)로 좁히세요.

## 3천만 원대

핵심 상권 **앵커 1개 + 보조 매체**로 주파수를 확보합니다. DOOH는 시간대·요일 타기팅으로 메시지를 쪼갤 수 있습니다.

## 1억 원 이상

전국·수도권 동시 집행 시 **패키지·네트워크** 단위 협상이 유리합니다. 제작·설치 일정을 통합 관리하세요.

## 효율적인 믹스 원칙

1. 목표 → KPI → 매체 후보 순으로 결정
2. 상보 포맷(대형 + 근접 + 교통) 조합
3. 사후 측정(검색·QR·매장) 설계를 사전에 포함`,
    thumbnail: null,
    published: true,
    publishedAt: new Date("2026-03-15T09:00:00.000Z"),
    updatedAt: now,
  },
];

export function listDemoAcademyArticles(opts: {
  category?: AcademyArticleCategory | null;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);
  let rows = [...DEMO_ACADEMY_ARTICLES].sort(
    (a, b) =>
      (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  if (opts.category) {
    rows = rows.filter((r) => r.category === opts.category);
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    articles: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export function getDemoAcademyArticleBySlug(
  slug: string,
): DemoAcademyArticle | null {
  return DEMO_ACADEMY_ARTICLES.find((r) => r.slug === slug) ?? null;
}
