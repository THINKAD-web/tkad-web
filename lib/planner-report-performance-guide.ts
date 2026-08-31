import { formatPlannerSharePct } from "@/lib/planner-logic";

/** PDF·카드 각주 — raw traffic + 기여도 병기 시 */
export function footfallVsReachShortFootnote(isKo: boolean): string {
  return isKo
    ? "※ 일 유동인구와 실노출 기여(%)는 서로 다른 기준입니다."
    : "※ Daily footfall and reach share (%) use different bases.";
}

/** SYMPTOM3 — 유동인구 vs 실노출 짧은 각주 (카드·PDF·믹스 패널 공용) */
export function footfallVsReachFootnote(isKo: boolean): string {
  return isKo
    ? "유동인구(지나간 사람)와 실노출(광고를 본 추정)은 다릅니다. 기여도·비중·CPM은 실노출 기준입니다."
    : "Footfall (passers-by) and reach (estimated ad views) differ. Shares and CPM use reach estimates.";
}

/** 브리프 믹스·PDF KPI — SOV 보정 총노출 라벨 */
export const PLANNER_TOTAL_REACH_LABEL = {
  ko: "총 실노출(추정)",
  en: "Est. total reach",
} as const;

export type PlannerPerformanceGuide = {
  title: string;
  bullets: string[];
  table: {
    headers: string[];
    rows: { label: string; cells: string[] }[];
  };
};

type LabeledPct = { label: string; pct: number };
type LabeledCpm = { label: string; value: number };

/**
 * 성과 요약 차트(예산·노출·CPM) 해석 가이드 — 포트폴리오 실측 수치 기반.
 * 웹·PDF·PPTX 공용 payload 에 넣는다.
 */
export function buildPerformanceChartGuide(
  isKo: boolean,
  budgetSplit: LabeledPct[],
  impressionSplit: LabeledPct[],
  cpmBars: LabeledCpm[],
): PlannerPerformanceGuide | null {
  if (
    budgetSplit.length < 2 ||
    impressionSplit.length < 2 ||
    cpmBars.length < 2
  ) {
    return null;
  }

  const labels = budgetSplit.map((s) => s.label);
  const budgetByLabel = new Map(budgetSplit.map((s) => [s.label, s.pct]));
  const impByLabel = new Map(impressionSplit.map((s) => [s.label, s.pct]));
  const cpmByLabel = new Map(cpmBars.map((c) => [c.label, c.value]));

  const fmtPct = (p: number) => formatPlannerSharePct(p);
  const fmtCpm = (n: number) =>
    `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;

  const table = {
    headers: isKo ? ["구분", ...labels] : ["Metric", ...labels],
    rows: [
      {
        label: isKo ? "예산 (월 단가)" : "Budget (monthly rate)",
        cells: labels.map((l) => fmtPct(budgetByLabel.get(l) ?? 0)),
      },
      {
        label: isKo ? "노출 비중" : "Impression share",
        cells: labels.map((l) => fmtPct(impByLabel.get(l) ?? 0)),
      },
      {
        label: isKo ? "CPM (천 회)" : "CPM (per 1k imp.)",
        cells: labels.map((l) => fmtCpm(cpmByLabel.get(l) ?? 0)),
      },
    ],
  };

  const sortedCpm = [...cpmBars].sort((a, b) => a.value - b.value);
  const lowCpm = sortedCpm[0]!;
  const highCpm = sortedCpm[sortedCpm.length - 1]!;
  const cpmRatio =
    lowCpm.value > 0
      ? Math.round((highCpm.value / lowCpm.value) * 10) / 10
      : 0;

  const budgetPhrase = labels
    .map((l) => `${l} ${fmtPct(budgetByLabel.get(l) ?? 0)}`)
    .join(isKo ? " · " : " · ");
  const impPhrase = labels
    .map((l) => `${l} ${fmtPct(impByLabel.get(l) ?? 0)}`)
    .join(isKo ? " · " : " · ");

  const bullets = isKo
    ? [
        "유동인구와 실노출은 다릅니다. 유동인구는 매체 앞을 지나간 전체 인원이고, 실노출은 그중 광고가 실제로 노출되는 비율(디지털 사이니지의 경우 전체 광고 루프 중 내 소재가 차지하는 몫)을 반영한 추정치입니다. 보고서의 노출·CPM·비중은 모두 실노출 기준이며, 디지털 매체는 여러 광고가 시간을 나눠 쓰므로 유동인구 대비 실노출 비율이 고정형 매체보다 낮게 나타납니다.",
        "예산 배분 도넛은 선택 매체 월 단가 합 기준입니다. 고가·저가 매체를 함께 담으면 돈 기준 비중이 비슷해 보일 수 있습니다.",
        `노출 비중은 유형별 추정 노출(일일×30) 합입니다. CPM이 낮은 ${lowCpm.label}(₩${lowCpm.value.toLocaleString("ko-KR")})은 같은 예산으로 ${cpmRatio > 1 ? `약 ${cpmRatio}배` : "더"} 많은 노출을 만듭니다.`,
        `이 포트폴리오 기준 — 예산: ${budgetPhrase} / 노출: ${impPhrase}. 두 비중이 다르게 보이는 것이 정상입니다.`,
        `고 CPM(${highCpm.label})은 브랜드·임팩트, 저 CPM(${lowCpm.label})은 노출 볼륨 역할로 함께 설계된 구성으로 이해하시면 됩니다.`,
      ]
    : [
        "Daily footfall and daily reach are different figures. Footfall is everyone who passes the medium; reach is the estimated share who actually see the ad — for digital signage, the portion of the shared ad loop your creative occupies. Every impression, CPM and share figure in this report uses reach, and because digital media split screen time across multiple ads, their reach-to-footfall ratio runs lower than static media.",
        "The budget donut reflects monthly unit prices of selected media. Mixing premium and efficient inventory can make spend shares look similar.",
        `Impression share uses estimated monthly impressions (daily×30) by type. Lower CPM ${lowCpm.label} (₩${lowCpm.value.toLocaleString("en-US")}) delivers ${cpmRatio > 1 ? `about ${cpmRatio}×` : "more"} impressions per won.`,
        `This portfolio — budget: ${budgetPhrase} / impressions: ${impPhrase}. Different shares are expected.`,
        `Treat higher CPM (${highCpm.label}) as brand impact and lower CPM (${lowCpm.label}) as volume — complementary roles in one plan.`,
      ];

  return {
    title: isKo ? "성과 지표 읽는 법" : "How to read these metrics",
    bullets,
    table,
  };
}
