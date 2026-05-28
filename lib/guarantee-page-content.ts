import {
  PERFORMANCE_GUARANTEE_MIN_EXECUTIONS,
  PERFORMANCE_GUARANTEE_MIN_RATING,
  PERFORMANCE_GUARANTEE_MIN_REVIEWS,
} from "@/lib/performance-guarantee";
import { CONTACT_EMAIL } from "@/lib/constants";

export const GUARANTEE_PAGE_META = {
  titleKo: "성과 보증 정책",
  titleEn: "Performance Guarantee Policy",
  descriptionKo:
    "OOH 성과 데이터 보증 — 배지 부여 기준, 예측 정확도, 미달 시 환불 조건, 인증 사진 정책",
  descriptionEn:
    "OOH performance data guarantee — badge criteria, prediction accuracy, refund terms, and proof photo policy",
  keywordsKo: [
    "OOH 성과 보증",
    "광고 성과 환불",
    "인증 사진",
    "성과 데이터",
    "THINKAD",
  ],
  keywordsEn: [
    "OOH performance guarantee",
    "advertising refund",
    "proof photos",
    "performance data",
    "THINKAD",
  ],
  heroEyebrow: "// 25 · GUARANTEE",
  heroTitleKo: "성과 ",
  heroHighlightKo: "보증 정책",
  heroTitleEn: "Performance ",
  heroHighlightEn: "Guarantee",
  heroDescriptionKo:
    "데이터로 증명하는 OOH — 배지 기준, 예측 정확도, 미달 시 환불·인증 사진 정책",
  heroDescriptionEn:
    "OOH backed by data — badge criteria, prediction accuracy, refunds, and proof photo rules",
  lastUpdated: "2026.05.26",
} as const;

export type GuaranteeBadgeCriterion = {
  id: string;
  labelKo: string;
  labelEn: string;
  valueKo: string;
  valueEn: string;
  detailKo: string;
  detailEn: string;
};

export const GUARANTEE_BADGE_CRITERIA: GuaranteeBadgeCriterion[] = [
  {
    id: "executions",
    labelKo: "집행 횟수",
    labelEn: "Completed flights",
    valueKo: `${PERFORMANCE_GUARANTEE_MIN_EXECUTIONS}회 이상`,
    valueEn: `${PERFORMANCE_GUARANTEE_MIN_EXECUTIONS}+ flights`,
    detailKo: "플랫폼을 통해 완료·리포트가 확인된 집행",
    detailEn: "Completed campaigns with verified reports on THINKAD",
  },
  {
    id: "reviews",
    labelKo: "광고주 리뷰",
    labelEn: "Advertiser reviews",
    valueKo: `${PERFORMANCE_GUARANTEE_MIN_REVIEWS}개 이상`,
    valueEn: `${PERFORMANCE_GUARANTEE_MIN_REVIEWS}+ reviews`,
    detailKo: "실제 집행 경험이 있는 광고주 후기",
    detailEn: "Reviews from advertisers with completed flights",
  },
  {
    id: "rating",
    labelKo: "평균 평점",
    labelEn: "Average rating",
    valueKo: `${PERFORMANCE_GUARANTEE_MIN_RATING.toFixed(1)} 이상`,
    valueEn: `${PERFORMANCE_GUARANTEE_MIN_RATING.toFixed(1)}+ stars`,
    detailKo: "리뷰 기반 평균 평점",
    detailEn: "Average score from verified reviews",
  },
  {
    id: "photos",
    labelKo: "인증 사진",
    labelEn: "Proof photos",
    valueKo: "1장 이상",
    valueEn: "1+ photo",
    detailKo: "현장 촬영·GPS·일시가 확인된 인증 사진",
    detailEn: "Field photos with GPS and timestamp verification",
  },
];

export type GuaranteeCategory = {
  id: string;
  number: string;
  kickerKo: string;
  kickerEn: string;
  titleKo: string;
  titleEn: string;
  accentKo?: string;
  accentEn?: string;
  metaKo: string;
  metaEn: string;
  introKo?: string;
  introEn?: string;
  bulletsKo?: string[];
  bulletsEn?: string[];
  highlightKo?: string;
  highlightEn?: string;
  showCriteria?: boolean;
};

export const GUARANTEE_CATEGORIES: GuaranteeCategory[] = [
  {
    id: "overview",
    number: "01",
    kickerKo: "개요",
    kickerEn: "OVERVIEW",
    titleKo: "성과 데이터 보증",
    titleEn: "Performance data guarantee",
    metaKo: "데이터로 증명하는 OOH",
    metaEn: "OOH impact you can verify",
    introKo:
      "THINKAD 싱커드는 OOH 광고의 효과를 데이터로 증명합니다. 플래너 예측·집행 후 실측·인증 사진을 연계해 광고주가 성과를 검증할 수 있도록 합니다.",
    introEn:
      "THINKAD proves OOH impact with data — planner forecasts, post-flight measurements, and field proof photos linked in one flow.",
    bulletsKo: [
      "플래너에서 예측 노출·도달을 확인하고 집행 후 실측과 비교",
      "완료 리포트에 예측 vs 실측 수치를 함께 제공",
      "인증 사진 업로드 시 실측치 확정 및 배지 유지",
    ],
    bulletsEn: [
      "Compare planner forecasts with post-flight measurements",
      "Completion reports show predicted vs. measured impressions",
      "Proof photos finalize measured numbers and badge eligibility",
    ],
  },
  {
    id: "badge",
    number: "02",
    kickerKo: "배지",
    kickerEn: "BADGE",
    titleKo: "「성과 데이터 보증」 배지",
    titleEn: "Performance data guaranteed badge",
    accentKo: "성과 데이터 보증",
    accentEn: "Performance data guaranteed",
    metaKo: "4가지 기준 충족 시 부여",
    metaEn: "Awarded when all four criteria are met",
    introKo:
      "매체 상세·검색 카드에 표시되는 📊 성과 데이터 보증 배지는 아래 기준을 모두 충족한 매체에만 부여됩니다.",
    introEn:
      "The 📊 Performance data guaranteed badge on media listings is shown only when a medium meets all criteria below.",
    showCriteria: true,
  },
  {
    id: "prediction",
    number: "03",
    kickerKo: "예측",
    kickerEn: "FORECAST",
    titleKo: "예측 정확도",
    titleEn: "Prediction accuracy",
    accentKo: "정확도",
    accentEn: "accuracy",
    metaKo: "플래너·실측 연계",
    metaEn: "Planner + measured results",
    bulletsKo: [
      "플래너 노출·도달 추정치는 매체 유동·단가·과거 집행 실측을 반영한 내부 모델입니다.",
      "플랫폼 예측 정확도는 최근 완료 캠페인(인증 사진 포함)의 예측 대비 실측 오차를 누적해 산출합니다.",
      "완료 리포트에는 「예측 노출」과 「실측 노출」을 함께 표시하며, 인증 사진이 업로드될수록 실측치가 확정됩니다.",
    ],
    bulletsEn: [
      "Planner reach/impression estimates use traffic, pricing, and historical verified flights.",
      "Platform accuracy is computed from recent completed campaigns with proof photos.",
      "Completion reports show predicted vs. measured impressions; proof uploads finalize numbers.",
    ],
  },
  {
    id: "refund",
    number: "04",
    kickerKo: "환불",
    kickerEn: "REFUND",
    titleKo: "성과 미달 시 환불",
    titleEn: "Refund when performance falls short",
    accentKo: "환불",
    accentEn: "Refund",
    metaKo: "80% 미달 · 14일 이내 신청",
    metaEn: "Below 80% · claim within 14 days",
    bulletsKo: [
      "계약서·견적서에 「성과 보증」 조항이 명시된 캠페인에 한해 적용됩니다.",
      "집행 완료 후 플래너·계약서에 기재된 예측 노출 대비 실측 노출이 80% 미만인 경우, 미달분에 해당하는 광고비를 환불·크레딧으로 보상할 수 있습니다.",
      "환불 산정은 인증 사진·GPS·촬영 일시가 확인된 실측 데이터를 기준으로 하며, 천재지변·매체사 귀책 외 광고주 사유(소재 지연·조기 종료 등)는 제외됩니다.",
      `환불 요청: 집행 종료 후 14일 이내, ${CONTACT_EMAIL} 또는 고객센터(02-515-2772)로 캠페인 ID·완료 리포트·미달 근거를 제출해 주세요.`,
    ],
    bulletsEn: [
      "Applies only to campaigns with an explicit performance guarantee in the contract or quote.",
      "If measured impressions are below 80% of the contracted/planner prediction after flight, the shortfall may be refunded or credited.",
      "Refunds use verified proof data (GPS, timestamps). Force majeure and advertiser-caused delays are excluded.",
      `File claims within 14 days of campaign end at ${CONTACT_EMAIL} or support (02-515-2772) with campaign ID and completion report.`,
    ],
    highlightKo: "개별 캠페인의 성과 보증·환불은 계약 조항 및 본 정책을 따릅니다.",
    highlightEn:
      "Binding guarantees for each campaign follow contract terms and this policy.",
  },
  {
    id: "proof",
    number: "05",
    kickerKo: "인증",
    kickerEn: "PROOF",
    titleKo: "인증 사진·페널티",
    titleEn: "Proof photos & penalties",
    accentKo: "인증",
    accentEn: "Proof",
    metaKo: "현장 검증 의무",
    metaEn: "Field verification duty",
    bulletsKo: [
      "매체사·현장 담당자는 집행 기간 중 합의된 횟수 이상 현장 인증 사진을 업로드해야 합니다.",
      "인증 사진 미제공·허위 업로드가 확인되면 해당 매체의 「성과 데이터 보증」 배지가 즉시 해제되며, 반복 시 매체 노출·즉시 예약 등급이 하향 조정될 수 있습니다.",
      "광고주에게 인증 사진이 제공되지 않아 실측 검증이 불가능한 경우, 회사는 대체 실측(유동 데이터·제3자 리포트)을 제공하거나, 미인증 기간에 대한 부분 환불을 검토합니다.",
    ],
    bulletsEn: [
      "Media owners must upload agreed field proof photos during the flight period.",
      "Missing or fraudulent proof may revoke the performance badge and lower listing priority.",
      "If proof is unavailable, THINKAD may provide alternative measurement or partial refund for unverified periods.",
    ],
  },
  {
    id: "disclaimer",
    number: "06",
    kickerKo: "면책",
    kickerEn: "DISCLAIMER",
    titleKo: "정책 안내",
    titleEn: "Policy notice",
    accentKo: "안내",
    accentEn: "notice",
    metaKo: "참고용 예측치",
    metaEn: "Indicative forecasts",
    introKo:
      "예측치는 참고용이며, 개별 캠페인의 성과 보증·환불은 별도 계약 조항 및 본 정책에 따릅니다.",
    introEn:
      "Forecasts are indicative; binding guarantees follow individual contracts and this policy.",
    highlightKo:
      "본 문서는 법무팀 검토 전 임시 표준 템플릿입니다. 정식 오픈 시 개별 고지됩니다.",
    highlightEn:
      "This document is a provisional template pending legal review. A formal version will be published at launch.",
  },
];

export const GUARANTEE_CATEGORY_NAV = GUARANTEE_CATEGORIES.map((c) => ({
  id: c.id,
  labelKo: c.titleKo,
  labelEn: c.titleEn,
}));
