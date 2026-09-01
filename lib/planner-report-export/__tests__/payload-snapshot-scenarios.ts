/**
 * Wave 0 — CalcEngine 교체 전 금액 출력을 고정하기 위한 시나리오 정의.
 *
 * `buildOohReportPayload` 출력이 **경계선** 이다. 내부를 어떻게 바꾸든
 * 이 경계에서 금액이 안 움직이면 A-1 의 「금액 변화 없는 순수 리팩터링」
 * 전제가 지켜진 것이다.
 *
 * `buildScenarioArgs` 는 `usePlannerReportDerived`
 * (components/planner-report-step.tsx:209) 가 payload 에 넘기는 입력을
 * 그대로 재현한다. Wave 4 에서 그 훅을 PlanResult 소비로 바꿀 때
 * 이 재현부도 함께 바꾸고, 그래도 스냅샷이 일치해야 한다.
 */

import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { computePlanCartRegionalBreakdown } from "@/lib/plan-cart-report/regional-breakdown";
import {
  plannerMediaPeriodLineWon,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import type { BuildOohPayloadArgs } from "@/lib/planner-report-export/payload-ooh";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울특별시",
    locationEn: "Seoul",
    region: "seoul",
    type: "dooh",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

const M_GWANAK = media({
  id: "m1",
  name: "서울대입구역 맥스비전",
  nameEn: "SNU Station MaxVision",
  type: "dooh",
  price: 4_000_000,
  dailyFootTraffic: 165_000,
  city: "서울",
  district: "관악구",
  regionZone: "gwanak",
  mediaMainCategory: "billboard",
});

const M_GANGNAM = media({
  id: "m2",
  name: "강남대로 빌보드",
  nameEn: "Gangnam-daero Billboard",
  type: "static",
  price: 2_000_000,
  dailyFootTraffic: 52_000,
  city: "서울",
  district: "강남구",
  regionZone: "gangnam",
  regionMain: "seoul",
  regionSub: "seoul_gangnam",
  mediaMainCategory: "billboard",
});

const M_HONGDAE = media({
  id: "m3",
  name: "홍대 버스 래핑",
  nameEn: "Hongdae Bus Wrap",
  type: "mobile",
  price: 1_000_000,
  dailyFootTraffic: 25_000,
  city: "서울",
  district: "마포구",
  regionZone: "mapo",
  regionMain: "seoul",
  regionSub: "seoul_hongdae",
  mediaMainCategory: "transit",
});

/** 저장 노출과 일 유동인구 환산값이 어긋나는 매체 — A안 준수 확인용 */
const M_CONFLICT = media({
  id: "m-conflict",
  name: "노출 충돌 매체",
  nameEn: "Conflicting Impressions Media",
  type: "dooh",
  price: 3_000_000,
  dailyFootTraffic: 165_000, // × 30 = 4,950,000
  impressions: 9_000_000, // 저장값이 다르다
  city: "서울",
  district: "중구",
  regionZone: "downtown",
  regionMain: "seoul",
  regionSub: "seoul_cbd",
  mediaMainCategory: "billboard",
});

const M_NETWORK = media({
  id: "m-nw",
  name: "편의점 네트워크",
  nameEn: "CVS Network",
  type: "dooh",
  catalogSource: "network",
  price: 6_000_000,
  dailyFootTraffic: 80_000,
  networkMinUnits: 10,
  // 네트워크 가격 경로를 실제로 태우려면 유닛 단가가 있어야 한다.
  // 없으면 monthly price 가 0 이 되어 이 시나리오가 아무것도 검증하지 못한다.
  networkPricePerUnit: 300_000,
  city: "서울",
  regionMain: "seoul",
  regionSub: "seoul_cbd",
  mediaMainCategory: "digital",
});

export type SnapshotScenario = {
  id: string;
  /** 이 시나리오가 지키려는 것 */
  purpose: string;
  portfolio: MediaItem[];
  months: number;
  budgetMan: number;
  quantities?: Record<string, number>;
  priceOptionIndex?: Record<string, number>;
};

export const SNAPSHOT_SCENARIOS: readonly SnapshotScenario[] = [
  {
    id: "korea-campaign-21d",
    purpose: "합의된 회귀 케이스 — 3매체 · 21일 · 700만",
    portfolio: [M_GWANAK, M_GANGNAM, M_HONGDAE],
    months: 21 / 30,
    budgetMan: 700,
  },
  {
    id: "exact-30d",
    purpose: "요율 키 정확 일치 경로 (30days)",
    portfolio: [M_GWANAK, M_GANGNAM, M_HONGDAE],
    months: 1,
    budgetMan: 700,
  },
  {
    id: "two-week-14d",
    purpose: "2주 프리셋 — 15days 키 불일치로 선형 폴백 (A-6 확인 대상)",
    portfolio: [M_GWANAK, M_GANGNAM, M_HONGDAE],
    months: 14 / 30,
    budgetMan: 700,
  },
  {
    id: "with-quantities",
    purpose: "units 비례 경로 — 수량 2 이상 (도달 변화 관측 대상)",
    portfolio: [M_GWANAK, M_HONGDAE],
    months: 1,
    budgetMan: 700,
    quantities: { m3: 4 },
  },
  {
    id: "with-network",
    purpose: "네트워크 매체 — 패키지 단가 경로",
    portfolio: [M_GWANAK, M_NETWORK],
    months: 1,
    budgetMan: 1200,
    quantities: { "m-nw": 20 },
  },
  {
    id: "single-media",
    purpose: "경계 케이스 — 매체 1개",
    portfolio: [M_GANGNAM],
    months: 1,
    budgetMan: 200,
  },
  {
    id: "impressions-conflict",
    purpose:
      "A안 준수 — impressions 저장값을 무시하고 일 유동인구 기준을 쓰는지 고정",
    portfolio: [M_CONFLICT, M_GANGNAM],
    months: 1,
    budgetMan: 500,
  },
];

/**
 * `usePlannerReportDerived` 재현 — payload 입력 조립.
 * Wave 4 에서 이 함수를 PlanResult 소비로 바꾼다.
 */
export function buildScenarioArgs(s: SnapshotScenario): BuildOohPayloadArgs {
  const pricing: PlannerPortfolioPricing = {
    quantities: s.quantities,
    priceOptionIndex: s.priceOptionIndex,
  };
  const periodCtx = s.months > 0 ? { months: s.months } : undefined;

  // A-1 Wave 4 — 재현부도 새 경로로 교체했다.
  // `usePlannerReportDerived` 가 지금 하는 것과 같다.
  // **이 교체 후에도 스냅샷이 그대로여야** A-1 전체가 값 중립임이 증명된다.
  const plan = calculatePlan({
    media: s.portfolio.map((m) => ({
      media: m,
      units: pricing.quantities?.[m.id],
      itemNet: plannerMediaPeriodLineWon(
        m,
        periodCtx ?? { months: 1 },
        pricing,
        true,
      ),
    })),
    period: { kind: "months", months: s.months > 0 ? s.months : 1 },
    budgetWon: Math.max(0, s.budgetMan) * 10_000,
  });

  const budgetAllocation = plan.breakdown.byCategory.map((x) => ({
    key: x.key,
    label: x.labelKo,
    pct: x.budgetShare,
    valueWon: x.budgetAmount,
    actualWon: x.budgetAmount,
  }));

  const cpmBars = plan.breakdown.byCategory
    .filter((x) => (x.cpmWon ?? 0) > 0)
    .map((x) => ({ key: x.key, label: x.labelKo, value: x.cpmWon ?? 0 }))
    .sort((x, y) => x.value - y.value);

  const report = {
    monthlyImpressions: plan.impressions.monthlyEquivalent,
    totalImpressions: plan.impressions.campaignTotal,
    blendedCpmKrw: plan.cpm.campaignWon,
  };

  // planner-page-client 재현 — 지역 표는 호출자가 계산해 payload 에 넘긴다.
  // 이 함수 안의 `Math.max(1, months)` 클램프가 Wave 2 교체 대상이다.
  const regionBreakdown = computePlanCartRegionalBreakdown(
    s.portfolio,
    s.months,
    true,
    pricing,
  );

  return {
    isKo: true,
    goalTitle: "브랜드 인지도",
    budgetMan: s.budgetMan,
    periodDisplay: `${Math.round(s.months * 30)}일`,
    regionsText: "서울",
    categoriesText: "디지털·고정형·이동형",
    ageText: "전 연령",
    industryText: "F&B",
    portfolio: s.portfolio,
    metrics: {
      estimatedMonthlyImpressions: report.monthlyImpressions,
      estimatedTotalImpressions: report.totalImpressions,
      blendedCpmKrw: report.blendedCpmKrw,
    } as unknown as BuildOohPayloadArgs["metrics"],
    blendedCpmKrw: report.blendedCpmKrw,
    budgetAllocation,
    cpmBars,
    effectSummaryLines: [],
    generatedAt: "2026-08-21",
    months: s.months,
    regionBreakdown,
    campaignMediaQuantities: s.quantities,
    campaignMediaPriceOptionIndex: s.priceOptionIndex,
  };
}
