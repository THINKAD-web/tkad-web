import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import {
  PLANNER_INDUSTRY_HINTS,
  PLANNER_INDUSTRY_TO_MATCHING,
} from "@/lib/planner/industry-match";
import { proposalGoalToPlanner } from "@/lib/proposal/prefill-from-planner";
import type { ProposalGoal } from "@/lib/proposal/types";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import { buildReportStrategyLines } from "@/lib/planner/report-strategy";
import {
  buildOnlineReportStrategyLines,
  buildOnlineReportWhyLine,
  type OnlineReportStrategyInput,
} from "@/lib/planner/report-strategy-online";
import { joinReportCopyLines } from "@/lib/planner-report-export/report-copy";
import {
  ONLINE_INSIGHTS_DISCLAIMER_EN,
  ONLINE_INSIGHTS_DISCLAIMER_KO,
} from "@/lib/planner-report-export/online-report-insights";

const PROPOSAL_ONLINE_BUDGET_DISCLAIMER_KO =
  "본 제안서의 온라인 예산 배분은 플래너 카트와 다를 수 있으며, 최소 집행금액 미달 채널은 견적 참고용입니다.";
const PROPOSAL_ONLINE_BUDGET_DISCLAIMER_EN =
  "Online budget splits in this proposal may differ from the plan cart; channels below minimum spend are indicative only.";

export type ProposalComposition = "onlyOoh" | "onlyOnline" | "mixed";

export type ProposalNarrativeBrief = {
  brandName: string;
  industry: string;
  campaignName: string;
  goal: ProposalGoal;
  startDate: string;
  endDate: string;
  budgetManwon: number;
  regions: readonly string[];
  targetAge?: string;
  targetGender?: string;
  locale?: "ko" | "en";
};

type TimelinePhase = {
  phase: string;
  period: string;
  tasks: string[];
};

function deterministicHash(id: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickIndex(length: number, seed: number, slot: string): number {
  if (length <= 0) return 0;
  return deterministicHash(slot, seed) % length;
}

function pickFromPool<T>(pool: readonly T[], seed: number, slot: string): T {
  return pool[pickIndex(pool.length, seed, slot)]!;
}

function pickManyFromPool<T>(
  pool: readonly T[],
  count: number,
  seed: number,
  slot: string,
): T[] {
  const items = [...pool];
  let s = deterministicHash(slot, seed) || 1;
  for (let i = items.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items.slice(0, Math.min(count, items.length));
}

export function proposalCopySeed(
  brief: ProposalNarrativeBrief,
  mediaIds: readonly string[],
  composition: ProposalComposition,
): number {
  const key = [
    brief.brandName,
    brief.industry,
    brief.goal,
    String(brief.budgetManwon),
    brief.startDate,
    brief.endDate,
    [...brief.regions].sort().join("|"),
    [...mediaIds].sort().join("|"),
    composition,
  ].join("\0");
  return deterministicHash(key, 0x70726f70);
}

export function resolveIndustryKeyFromText(text: string): PlannerIndustryKey {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "indOther";

  for (const [key, value] of Object.entries(PLANNER_INDUSTRY_TO_MATCHING)) {
    if (normalized === value || normalized.includes(value)) {
      return key as PlannerIndustryKey;
    }
  }

  let best: { key: PlannerIndustryKey; hits: number } | null = null;
  for (const [key, hints] of Object.entries(PLANNER_INDUSTRY_HINTS)) {
    const hits = hints.filter((hint) =>
      normalized.includes(hint.toLowerCase()),
    ).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { key: key as PlannerIndustryKey, hits };
    }
  }
  return best?.key ?? "indOther";
}

function isKo(brief: ProposalNarrativeBrief): boolean {
  return brief.locale !== "en";
}

function goalTitle(brief: ProposalNarrativeBrief): string {
  if (!isKo(brief)) return brief.goal;
  switch (brief.goal) {
    case "awareness":
      return "브랜드 인지도";
    case "conversion":
      return "전환·실적";
    case "event":
      return "이벤트·프로모션";
  }
}

function regionsText(brief: ProposalNarrativeBrief): string {
  return brief.regions.join(", ") || (isKo(brief) ? "타깃 지역" : "target regions");
}

function targetSummary(brief: ProposalNarrativeBrief): string {
  if (isKo(brief)) {
    const age = brief.targetAge?.trim() || "전 연령";
    const gender = brief.targetGender?.trim() || "전체";
    return `${age}, ${gender}`;
  }
  const age = brief.targetAge?.trim() || "broad age";
  const gender = brief.targetGender?.trim() || "all genders";
  return `${age}, ${gender}`;
}

const OOH_OVERVIEW_KO: readonly ((b: ProposalNarrativeBrief) => string)[] = [
  (b) =>
    `${b.brandName}의 「${b.campaignName}」은 ${b.startDate}~${b.endDate} ${regionsText(b)} 중심 ${goalTitle(b)} 캠페인입니다. 총 ${b.budgetManwon.toLocaleString("ko-KR")}만원으로 OOH·DOOH 반복 노출을 설계합니다.`,
  (b) =>
    `「${b.campaignName}」(${b.brandName})은 ${regionsText(b)} 동선에서 ${goalTitle(b)}를 목표로 ${b.startDate}부터 ${b.endDate}까지 집행합니다. 예산 ${b.budgetManwon.toLocaleString("ko-KR")}만원 규모의 OOH 믹스입니다.`,
  (b) =>
    `${b.brandName} · ${b.industry} 업종의 ${goalTitle(b)} 캠페인을 ${regionsText(b)}에 맞춰 제안합니다. ${b.startDate}~${b.endDate}, 총 ${b.budgetManwon.toLocaleString("ko-KR")}만원.`,
  (b) =>
    `${regionsText(b)} 핵심 상권·이동 동선에 ${b.brandName} 「${b.campaignName}」 메시지를 배치합니다. ${goalTitle(b)} 목표, ${b.budgetManwon.toLocaleString("ko-KR")}만원, ${b.startDate}~${b.endDate}.`,
];

const OOH_OVERVIEW_EN: readonly ((b: ProposalNarrativeBrief) => string)[] = [
  (b) =>
    `${b.brandName} — "${b.campaignName}" targets ${b.goal} across ${regionsText(b)} from ${b.startDate} to ${b.endDate} with a ${b.budgetManwon}×10k KRW OOH mix.`,
  (b) =>
    `"${b.campaignName}" for ${b.brandName} (${b.industry}) focuses on corridor visibility in ${regionsText(b)} during ${b.startDate}–${b.endDate}. Budget: ${b.budgetManwon}×10k KRW.`,
  (b) =>
    `An OOH-led ${b.goal} plan for ${b.brandName} in ${regionsText(b)}, ${b.startDate}–${b.endDate}, total ${b.budgetManwon}×10k KRW.`,
];

const OOH_STRATEGY_EXTRA_KO: Record<ProposalGoal, readonly string[]> = {
  awareness: [
    "인지 단계에서는 메인 매체에 핵심 메시지를 고정하고, 보조 매체로 빈도를 보강합니다.",
    "첫 2주는 브랜드명·한 줄 혜택 노출 비중을 높이고, 이후 시즌 메시지로 전환합니다.",
    "동일 동선 내 서로 다른 포맷(대형·교통·생활 밀착)을 조합해 기억 잔존을 높입니다.",
  ],
  conversion: [
    "방문·구매 유도 구간에서는 매장·상권 인근 매체와 행동 유도 카피를 우선 배치합니다.",
    "오프라인 노출과 검색·랜딩 연계를 전제로 QR·숏 URL 등 디지털 브릿지를 검토합니다.",
    "전환 목표에 맞춰 혜택·기한을 명확히 한 CTA 중심 소재를 메인 매체에 집중합니다.",
  ],
  event: [
    "행사 기간에 맞춰 이벤트 D-day 전후로 노출 페이스를 조절합니다.",
    "행사장·관련 상권 동선 매체를 우선하고, 기간 한정 메시지를 반복 노출합니다.",
    "사전 인지(티저) → 본행사 → 마감 리마인드 3구간으로 메시지 톤을 나눕니다.",
  ],
};

const OOH_STRATEGY_EXTRA_EN: Record<ProposalGoal, readonly string[]> = {
  awareness: [
    "Anchor the hero message on lead placements; support inventory builds frequency.",
    "Weeks 1–2 emphasize brand name and one-line benefit; later flights rotate seasonal copy.",
    "Mix formats along the same corridors to strengthen message recall.",
  ],
  conversion: [
    "Prioritize trade-area and store-adjacent inventory with action-oriented copy.",
    "Plan digital bridges (QR, short URL) assuming offline-to-search or landing follow-up.",
    "Lead placements carry clear offer and deadline CTAs aligned to conversion.",
  ],
  event: [
    "Pace flights around event D-day with higher weight pre- and during the window.",
    "Prioritize routes near the venue and related districts with time-bound messaging.",
    "Split teaser, live-event, and last-call tones across the flight.",
  ],
};

const ONLINE_GREETING_KO: readonly ((b: ProposalNarrativeBrief) => string)[] = [
  (b) => `${b.brandName}님, 안녕하세요.\n\n${goalTitle(b)} 목표에 맞춘 온라인 매체 제안입니다.`,
  (b) => `${b.brandName} · ${b.industry} 업종 온라인 캠페인 제안 드립니다.\n\n아래 구성은 ${regionsText(b)} 타깃(${targetSummary(b)}) 기준입니다.`,
  (b) => `안녕하세요, ${b.brandName} 「${b.campaignName}」 온라인 집행안입니다.\n\n예산 ${b.budgetManwon.toLocaleString("ko-KR")}만원, ${b.startDate}~${b.endDate}.`,
  (b) => `${b.brandName} · ${goalTitle(b)} 캠페인 — 총 ${b.budgetManwon.toLocaleString("ko-KR")}만원 규모 온라인 제안입니다.`,
  (b) => `「${b.campaignName}」(${b.industry}) 온라인 미디어 플랜 — ${regionsText(b)}, ${b.budgetManwon.toLocaleString("ko-KR")}만원.`,
];

const ONLINE_GREETING_EN: readonly ((b: ProposalNarrativeBrief) => string)[] = [
  (b) => `Dear ${b.brandName},\n\nPlease find our online media plan for "${b.campaignName}" (${b.goal}).`,
  (b) => `Online proposal for ${b.brandName} (${b.industry}), ${b.startDate}–${b.endDate}, budget ${b.budgetManwon}×10k KRW.`,
];

const ONLINE_STRATEGY_EXTRA_KO: Record<ProposalGoal, readonly string[]> = {
  awareness: [
    "초기에는 도달·빈도 위주, 이후 관심 전환에 유리한 소재로 교체 테스트합니다.",
    "플랫폼별 크롭·훅 3초 내 메시지를 분리해 스킵·이탈을 줄입니다.",
    "브랜드 서치·SNS 멘션 상승을 보조 KPI로 두고 주간 모니터링합니다.",
    "채널별 도달 겹침을 줄이기 위해 플랫폼 역할(인지 vs 보조)을 분리합니다.",
    "예산 규모에 맞춰 1~2주차는 테스트, 3주차부터 효율 채널에 비중을 재배분합니다.",
  ],
  conversion: [
    "전환 추적(픽셀·전환 API)을 선행 세팅하고, 랜딩·CTA를 채널별로 맞춥니다.",
    "고의도 키워드·리타깃 구간에 예산 비중을 두고, 크리에이티브는 혜택·기한 중심으로 운영합니다.",
    "주간 단위로 CPA·ROAS를 보고 저효율 소재·세트를 교체합니다.",
  ],
  event: [
    "행사 D-day 전후로 예산 페이스를 높이고, 기간 한정 카피를 집중 투입합니다.",
    "이벤트 랜딩·예약 페이지와 UTM을 통일해 채널별 기여를 추적합니다.",
    "행사 종료 후 리마인드·후기 UGC 소재로 잔여 관심을 전환합니다.",
  ],
};

const ONLINE_STRATEGY_EXTRA_EN: Record<ProposalGoal, readonly string[]> = {
  awareness: [
    "Lead with reach and frequency; rotate creative toward interest-led formats mid-flight.",
    "Split crops and hooks by platform to reduce skip rates in the first 3 seconds.",
    "Track branded search and social mentions as secondary KPIs weekly.",
  ],
  conversion: [
    "Set conversion tracking first; align landing pages and CTAs per platform.",
    "Weight budget toward high-intent keywords and retargeting with offer-led creative.",
    "Review CPA/ROAS weekly and replace underperforming ads and sets.",
  ],
  event: [
    "Increase pacing around event D-day with time-bound copy.",
    "Unify event landing URLs and UTMs for cross-channel attribution.",
    "Post-event reminders and UGC-style follow-ups capture remaining demand.",
  ],
};

const MIXED_OOH_OVERLAY_KO: readonly ((b: ProposalNarrativeBrief, oohCount: number) => string)[] = [
  (b, n) => `${regionsText(b)} OOH·DOOH ${n}개 매체로 오프라인 반복 노출을 설계합니다.`,
  (b, n) => `오프라인 ${n}개 매체는 상권·동선 기반, 온라인은 타깃·과금 최적화로 ${goalTitle(b)}를 보완합니다.`,
  (b, n) => `현장 ${n}개 OOH 매체와 디지털 채널을 연계해 인지→행동 퍼널을 구성합니다.`,
];

const MIXED_OOH_OVERLAY_EN: readonly ((b: ProposalNarrativeBrief, oohCount: number) => string)[] = [
  (b, n) => `${n} OOH/DOOH placements for corridor visibility in ${regionsText(b)}.`,
  (b, n) => `Offline (${n}) for district reach; online for paid targeting toward ${b.goal}.`,
  (b, n) => `${n} on-ground placements paired with digital for awareness-to-action.`,
];

const MIXED_STRATEGY_OVERLAY_KO: readonly string[] = [
  "오프라인은 브랜드 각인·빈도, 온라인은 세그먼트·전환 추적으로 역할을 분리합니다.",
  "OOH 노출 구간과 온라인 리타깃 타깃을 맞춰 크로스 채널 시너지를 노립니다.",
  "주간 리포트에서 OOH 송출·온라인 KPI를 함께 보고 예산·소재를 조정합니다.",
];

const MIXED_STRATEGY_OVERLAY_EN: readonly string[] = [
  "Offline builds recall and frequency; online handles segments and conversion tracking.",
  "Align OOH corridors with online retargeting pools for cross-channel lift.",
  "Weekly reports combine OOH posting and online KPIs for budget and creative tuning.",
];

const OUTCOMES_KO: Record<ProposalComposition, Record<ProposalGoal, readonly string[]>> = {
  onlyOoh: {
    awareness: [
      "타깃 상권 내 브랜드 인지도 상승",
      "디지털 연계 시 검색·방문 증가 기대",
      "반복 노출을 통한 메시지 리콜 강화",
      "집행 구간별 효율 데이터 확보",
      "핵심 동선에서의 브랜드 노출 빈도 확대",
      "경쟁 대비 현장 가시성 강화",
    ],
    conversion: [
      "매장·상권 인근 방문 동기 강화",
      "오프라인 CTA와 디지털 랜딩 연계 효과",
      "프로모션 기간 매출·전환 기여",
      "상권별 반응 데이터 축적",
      "한정 혜택 메시지의 현장 각인",
      "재방문·재구매 리마인드 기반 마련",
    ],
    event: [
      "행사 인지도·참여율 상승",
      "행사장·인근 동선에서의 메시지 도달",
      "기간 한정 프로모션 긴급성 전달",
      "행사 전후 검색·SNS 언급 증가 기대",
      "현장·온라인 연계 참여 데이터 확보",
      "차기 이벤트 재활용 인사이트",
    ],
  },
  onlyOnline: {
    awareness: [
      "타겟 플랫폼 내 브랜드·제안 도달 확대",
      "클릭·전환 추적 가능한 퍼포먼스 데이터 확보",
      "채널별 예산·소재 최적화 기반 마련",
      "차기 미디어믹스 고도화",
      "브랜드 서치·SNS 멘션 상승 기대",
      "플랫폼별 크리에이티브 학습 데이터 축적",
    ],
    conversion: [
      "전환·매출 KPI 추적 체계 확립",
      "고의도 타깃 세그먼트 도달",
      "CPA·ROAS 개선을 위한 A/B 테스트 기반",
      "리타깃·유사 타깃 확장 근거 확보",
      "랜딩·CTA 최적화 인사이트",
      "채널별 기여도 분석 리포트",
    ],
    event: [
      "행사 기간 디지털 도달·참여 확대",
      "기간 한정 오퍼 전환 추적",
      "행사 전후 페이스별 성과 비교",
      "UTM 기반 채널 기여 분석",
      "행사 후 리마인드 전환",
      "차기 이벤트 크리에이티브 벤치마크",
    ],
  },
  mixed: {
    awareness: [
      "OOH 반복 노출 + 온라인 타겟 도달 시너지",
      "채널별 KPI 추적으로 효율 개선",
      "브랜드 인지 및 전환 기여",
      "통합 집행 리포트 기반",
      "오프라인 각인과 디지털 리타깃 연계",
      "크로스 채널 메시지 일관성 강화",
    ],
    conversion: [
      "현장 노출과 온라인 전환 추적의 결합",
      "상권·세그먼트별 기여도 분석",
      "통합 CPA·ROAS 관리 기반",
      "오프라인 CTA → 디지털 전환 경로 검증",
      "채널 간 예산 재배분 근거",
      "재구매·재방문 리타깃 풀 확대",
    ],
    event: [
      "행사 전후 OOH·온라인 동시 페이싱",
      "현장·디지털 참여 데이터 통합",
      "기간 한정 메시지의 다채널 전달",
      "행사 종료 후 리마인드 전환",
      "통합 리포트로 채널별 기여 파악",
      "차기 이벤트 믹스 최적화",
    ],
  },
};

const OUTCOMES_EN: Record<ProposalComposition, Record<ProposalGoal, readonly string[]>> = {
  onlyOoh: {
    awareness: [
      "Stronger brand recall in target districts",
      "Uplift in search or store visits when paired with digital",
      "Consistent message frequency across the flight",
      "Actionable data for the next flight",
      "Higher visibility along priority corridors",
      "On-ground presence vs. competitors",
    ],
    conversion: [
      "Stronger visit intent near trade areas",
      "Offline CTA tied to digital landing paths",
      "Promotional period sales contribution",
      "District-level response data",
      "Urgency from limited-time offers on-site",
      "Basis for repeat-visit retargeting",
    ],
    event: [
      "Higher event awareness and attendance intent",
      "Reach along venue and nearby routes",
      "Time-bound promotion urgency on-site",
      "Search and social lift around the event",
      "Cross-channel participation data",
      "Insights for the next event flight",
    ],
  },
  onlyOnline: {
    awareness: [
      "Broader reach on selected platforms",
      "Trackable performance data",
      "Basis for budget and creative optimization",
      "Inputs for the next media mix",
      "Branded search and social mention lift",
      "Platform-level creative learning",
    ],
    conversion: [
      "Conversion and revenue KPI tracking",
      "Reach to high-intent segments",
      "A/B test baseline for CPA/ROAS",
      "Retargeting and lookalike expansion",
      "Landing and CTA optimization insights",
      "Channel contribution reporting",
    ],
    event: [
      "Digital reach and engagement during the event window",
      "Time-bound offer conversion tracking",
      "Pre/during/post pacing comparison",
      "UTM-based channel attribution",
      "Post-event reminder conversions",
      "Creative benchmarks for future events",
    ],
  },
  mixed: {
    awareness: [
      "OOH frequency plus online targeting",
      "Cross-channel KPI tracking",
      "Brand and conversion uplift",
      "Integrated reporting baseline",
      "Offline recall with digital retargeting",
      "Consistent cross-channel messaging",
    ],
    conversion: [
      "On-ground exposure plus online conversion tracking",
      "Trade-area and segment contribution",
      "Unified CPA/ROAS management",
      "Offline CTA to digital path validation",
      "Budget reallocation across channels",
      "Expanded retargeting pools",
    ],
    event: [
      "Synchronized OOH and online event pacing",
      "Combined on-site and digital participation data",
      "Multi-channel time-bound messaging",
      "Post-event reminder conversions",
      "Integrated channel contribution view",
      "Optimized mix for the next event",
    ],
  },
};

const TIMELINE_TASKS_KO = {
  preflight: [
    "소재 가이드·규격 확정",
    "매체 예약·견적 확정",
    "집행 일정 LOCK",
    "브랜드 가이드·법무 검수",
    "현장 설치·송출 체크리스트",
    "픽셀·전환 추적 사전 점검",
  ],
  flight: [
    "송출·설치 모니터링",
    "현장 사진·리포트",
    "주간 성과 리뷰",
    "소재·세트 A/B 교체",
    "예산 페이스 조정",
    "이슈·클레임 대응",
  ],
  post: [
    "성과 요약",
    "차기 캠페인 제안",
    "채널별 ROI 회고",
    "크리에이티브 벤치마크 정리",
    "차기 미디어믹스 초안",
    "학습 데이터 아카이브",
  ],
} as const;

const TIMELINE_TASKS_EN = {
  preflight: [
    "Creative specs",
    "Booking confirmation",
    "Schedule lock",
    "Brand/legal review",
    "Posting checklist",
    "Pixel and conversion QA",
  ],
  flight: [
    "Monitoring",
    "Proof of posting",
    "Weekly performance review",
    "Creative A/B rotation",
    "Budget pacing tweaks",
    "Issue response",
  ],
  post: [
    "Performance wrap-up",
    "Next-step proposal",
    "Channel ROI review",
    "Creative benchmark notes",
    "Draft next media mix",
    "Learning archive",
  ],
} as const;

const ONLINE_INDUSTRY_LINE_KO: Record<
  PlannerIndustryKey,
  ((industryText: string) => string | null)
> = {
  indFb: (t) => `${t} 업종 — 식음·로컬 관심사 타깃과 플랫폼 세그먼트를 맞췄습니다.`,
  indRetail: (t) => `${t} 업종 — 쇼핑·뷰티 관심사·연령대에 맞는 플랫폼·과금을 반영했습니다.`,
  indTech: (t) => `${t} 업종 — IT·비즈니스 관심사와 검색·디스플레이 조합을 우선했습니다.`,
  indFinance: (t) => `${t} 업종 — 금융·투자 관심 타깃에 맞춘 플랫폼 구성입니다.`,
  indEnt: (t) => `${t} 업종 — 엔터·문화 관심사 기반 타깃·크리에이티브 톤을 반영했습니다.`,
  indOther: () => null,
};

const ONLINE_INDUSTRY_LINE_EN: Record<
  PlannerIndustryKey,
  ((industryText: string) => string | null)
> = {
  indFb: (t) => `${t} — F&B and local-interest segments drive platform choices.`,
  indRetail: (t) => `${t} — shopping and beauty interests inform platform and billing mix.`,
  indTech: (t) => `${t} — search and display weighted for tech/business audiences.`,
  indFinance: (t) => `${t} — platforms aligned to finance and investment interests.`,
  indEnt: (t) => `${t} — culture and entertainment interests shape targeting and creative tone.`,
  indOther: () => null,
};

function onlineIndustryLine(
  ko: boolean,
  industryKey: PlannerIndustryKey,
  industryText: string,
): string | null {
  const map = ko ? ONLINE_INDUSTRY_LINE_KO : ONLINE_INDUSTRY_LINE_EN;
  const fn = map[industryKey];
  return fn ? fn(industryText) : null;
}

function mediaPlatformLabel(m: MediaItem): string {
  return m.onlineSpec?.platform ?? m.type ?? "media";
}

function buildOohStrategyBlock(
  brief: ProposalNarrativeBrief,
  industryKey: PlannerIndustryKey,
  portfolioCount: number,
  seed: number,
): string {
  const ko = isKo(brief);
  const campaignGoal = proposalGoalToPlanner(brief.goal) as PlannerCampaignGoal;
  const baseLines = buildReportStrategyLines({
    isKo: ko,
    campaignGoal,
    goalTitle: goalTitle(brief),
    industryKey,
    industryText: brief.industry,
    regionsText: regionsText(brief),
    seoulZones: [],
    followUp: {},
    portfolioCount,
  });

  const extraPool = ko ? OOH_STRATEGY_EXTRA_KO[brief.goal] : OOH_STRATEGY_EXTRA_EN[brief.goal];
  const extras = pickManyFromPool(extraPool, 2, seed, "ooh-strategy-extra");

  const funnelLine = ko
    ? `핵심 타깃(${targetSummary(brief)})에게 상권·동선 기반 노출을 우선하고, 인지 → 관심 → ${brief.goal === "conversion" ? "전환" : "참여"} 퍼널에 맞춰 매체 역할을 분리합니다.`
    : `Prioritize corridor visibility for ${targetSummary(brief)}; separate hero vs support roles along the ${brief.goal} funnel.`;

  const lines = [...baseLines, funnelLine, ...extras].filter(Boolean);
  return lines.join("\n\n");
}

export function buildOohOverview(
  brief: ProposalNarrativeBrief,
  seed: number,
): string {
  const pool = isKo(brief) ? OOH_OVERVIEW_KO : OOH_OVERVIEW_EN;
  return pickFromPool(pool, seed, "ooh-overview")(brief);
}

export function buildOohStrategy(
  brief: ProposalNarrativeBrief,
  oohCount: number,
  seed: number,
): string {
  const industryKey = resolveIndustryKeyFromText(brief.industry);
  return buildOohStrategyBlock(brief, industryKey, oohCount, seed);
}

export function buildOohMediaRationale(
  brief: ProposalNarrativeBrief,
  media: MediaItem,
  index: number,
  seed: number,
): string {
  const ko = isKo(brief);
  const role = index === 0 ? "lead" : "support";
  const poolsKo = {
    lead: [
      `${regionsText(brief)} ${goalTitle(brief)}의 메인 노출 — ${media.type ?? "OOH"} 매체`,
      `${brief.industry} 업종·${targetSummary(brief)} 타깃에 맞춘 ${media.name} 핵심 배치`,
      `동선 상 가시성이 높은 ${media.type ?? "OOH"}로 브랜드 메시지 고정`,
    ],
    support: [
      `${regionsText(brief)} 보조 노출 — ${media.type ?? "OOH"} 빈도 보강`,
      `${goalTitle(brief)} 목표 보완용 ${media.name}`,
      `메인 매체와 겹치는 동선에서 리콜 강화`,
    ],
  };
  const poolsEn = {
    lead: [
      `Hero ${media.type ?? "OOH"} for ${brief.goal} in ${regionsText(brief)}`,
      `${media.name} — lead placement for ${brief.industry}, ${targetSummary(brief)}`,
      `High-visibility ${media.type ?? "OOH"} to anchor brand message`,
    ],
    support: [
      `Support ${media.type ?? "OOH"} for frequency in ${regionsText(brief)}`,
      `${media.name} — supports ${brief.goal} objective`,
      `Reinforces recall along overlapping corridors`,
    ],
  };
  const pool = ko ? poolsKo[role] : poolsEn[role];
  return pickFromPool(pool, seed, `ooh-rationale-${media.id}-${index}`);
}

export function buildOnlineMediaRationale(
  brief: ProposalNarrativeBrief,
  media: MediaItem,
  index: number,
  seed: number,
): string {
  const ko = isKo(brief);
  const platform = mediaPlatformLabel(media);
  const poolsKo = {
    lead: [
      `${platform} — ${goalTitle(brief)} 핵심 채널, ${targetSummary(brief)} 타깃`,
      `${brief.industry} 업종에 맞춘 ${platform} 메인 집행`,
      `${regionsText(brief)}·${goalTitle(brief)} 목표의 주력 플랫폼`,
    ],
    support: [
      `${platform} — ${goalTitle(brief)} 보조 도달·빈도`,
      `${media.name}로 세그먼트·소재 테스트`,
      `메인 채널 성과 보완용 ${platform}`,
    ],
  };
  const poolsEn = {
    lead: [
      `${platform} — primary for ${brief.goal}, ${targetSummary(brief)}`,
      `${platform} lead flight for ${brief.industry}`,
      `Main platform for ${regionsText(brief)} ${brief.goal}`,
    ],
    support: [
      `${platform} — support reach and frequency`,
      `${media.name} for segment and creative tests`,
      `${platform} complements lead channel performance`,
    ],
  };
  const role = index === 0 ? "lead" : "support";
  const pool = ko ? poolsKo[role] : poolsEn[role];
  return pickFromPool(pool, seed, `online-rationale-${media.id}-${index}`);
}

export function buildMixedMediaRationale(
  brief: ProposalNarrativeBrief,
  media: MediaItem,
  index: number,
  seed: number,
): string {
  if (media.catalogChannel === "online" || media.onlineSpec) {
    const base = buildOnlineMediaRationale(brief, media, index, seed);
    return isKo(brief)
      ? `${base} (통합 믹스 내 온라인)`
      : `${base} (online in integrated mix)`;
  }
  const base = buildOohMediaRationale(brief, media, index, seed);
  return isKo(brief) ? `${base} (통합 믹스 내 OOH)` : `${base} (OOH in integrated mix)`;
}

export function buildExpectedOutcomes(
  brief: ProposalNarrativeBrief,
  composition: ProposalComposition,
  seed: number,
): string[] {
  const table = isKo(brief) ? OUTCOMES_KO : OUTCOMES_EN;
  const pool = table[composition][brief.goal];
  return pickManyFromPool(pool, 4, seed, `outcomes-${composition}`);
}

export function buildProposalTimeline(
  brief: ProposalNarrativeBrief,
  seed: number,
): TimelinePhase[] {
  const ko = isKo(brief);
  const tasks = ko ? TIMELINE_TASKS_KO : TIMELINE_TASKS_EN;
  return [
    {
      phase: ko ? "사전 준비" : "Pre-flight",
      period: ko ? "집행 2~3주 전" : "2–3 weeks before launch",
      tasks: pickManyFromPool([...tasks.preflight], 3, seed, "timeline-preflight"),
    },
    {
      phase: ko ? "집행" : "Flight",
      period: `${brief.startDate} ~ ${brief.endDate}`,
      tasks: pickManyFromPool([...tasks.flight], 3, seed, "timeline-flight"),
    },
    {
      phase: ko ? "사후" : "Post-flight",
      period: ko ? "종료 후 1주" : "Within 1 week after end",
      tasks: pickManyFromPool([...tasks.post], 2, seed, "timeline-post"),
    },
  ];
}

export function buildMixedOohOverviewOverlay(
  brief: ProposalNarrativeBrief,
  oohCount: number,
  seed: number,
): string {
  const pool = isKo(brief) ? MIXED_OOH_OVERLAY_KO : MIXED_OOH_OVERLAY_EN;
  return pickFromPool(pool, seed, "mixed-ooh-overview")(brief, oohCount);
}

export function buildMixedOohStrategyOverlay(
  brief: ProposalNarrativeBrief,
  seed: number,
): string {
  const pool = isKo(brief) ? MIXED_STRATEGY_OVERLAY_KO : MIXED_STRATEGY_OVERLAY_EN;
  return pickFromPool(pool, seed, "mixed-ooh-strategy");
}

export function buildProposalOnlineCopy(
  brief: ProposalNarrativeBrief,
  strategyInput: OnlineReportStrategyInput,
  seed: number,
  channelLabels: readonly string[] = [],
): { greeting: string; executiveSummary: string; disclaimer: string } {
  const ko = isKo(brief);
  const greetingPool = ko ? ONLINE_GREETING_KO : ONLINE_GREETING_EN;
  let greeting = pickFromPool(greetingPool, seed, "online-greeting")(brief);

  if (channelLabels.length > 0) {
    const channelLeadPool = ko
      ? [
          `선정 ${channelLabels.length}개 채널: ${channelLabels.join(", ")}.`,
          `본 제안 채널 — ${channelLabels.join(" · ")}.`,
          `${channelLabels.length}개 플랫폼(${channelLabels.join(", ")}) 조합으로 ${goalTitle(brief)}를 설계했습니다.`,
        ]
      : [
          `${channelLabels.length} channel(s): ${channelLabels.join(", ")}.`,
          `Mix: ${channelLabels.join(" · ")}.`,
          `${goalTitle(brief)} plan across ${channelLabels.join(", ")}.`,
        ];
    greeting = `${greeting}\n\n${pickFromPool(channelLeadPool, seed, "online-channel-lead")}`;
  }

  const industryKey = strategyInput.industryKey ?? resolveIndustryKeyFromText(brief.industry);
  const baseStrategy = [
    buildOnlineReportWhyLine(strategyInput),
    ...buildOnlineReportStrategyLines(strategyInput),
  ];
  const indLine = onlineIndustryLine(ko, industryKey, brief.industry);
  if (indLine) baseStrategy.push(indLine);

  if (channelLabels.length > 0) {
    const channelStrategyPool = ko
      ? [
          `${channelLabels[0]}${channelLabels.length > 1 ? `을(를) 핵심으로, ${channelLabels.slice(1).join(", ")}은(는) 보조 도달·테스트` : " 중심"}으로 역할을 나눴습니다.`,
          `채널별(${channelLabels.join(" / ")}) 소재·과금 특성에 맞춰 예산 페이스를 분리합니다.`,
        ]
      : [
          `Lead with ${channelLabels[0]}${channelLabels.length > 1 ? `; ${channelLabels.slice(1).join(", ")} for support and tests` : ""}.`,
          `Split pacing by channel traits (${channelLabels.join(" / ")}).`,
        ];
    baseStrategy.push(pickFromPool(channelStrategyPool, seed, "online-channel-strategy"));
  }

  const extraPool = ko ? ONLINE_STRATEGY_EXTRA_KO[brief.goal] : ONLINE_STRATEGY_EXTRA_EN[brief.goal];
  baseStrategy.push(...pickManyFromPool(extraPool, 2, seed, "online-strategy-extra"));

  const disclaimer = ko
    ? `${PROPOSAL_ONLINE_BUDGET_DISCLAIMER_KO} ${ONLINE_INSIGHTS_DISCLAIMER_KO}`
    : `${PROPOSAL_ONLINE_BUDGET_DISCLAIMER_EN} ${ONLINE_INSIGHTS_DISCLAIMER_EN}`;

  return {
    greeting,
    executiveSummary: joinReportCopyLines(baseStrategy),
    disclaimer,
  };
}

export function buildStudioOohSectionNarrative(
  brief: ProposalNarrativeBrief,
  mediaCount: number,
  seed: number,
): {
  overview: string;
  marketAnalysis: string;
  strategy: string;
  expectedOutcomes: string[];
  timeline: TimelinePhase[];
} {
  const ko = isKo(brief);
  const industryKey = resolveIndustryKeyFromText(brief.industry);
  const overviewVariantsKo = [
    `${brief.brandName}의 ${brief.campaignName || brief.industry} 제안서입니다. ${brief.industry} 시장에서 ${goalTitle(brief)}를 목표로 OOH 중심 전략을 제시합니다.`,
    `${brief.industry} 업종 ${brief.brandName} — ${regionsText(brief)} ${goalTitle(brief)} OOH 제안 (${brief.budgetManwon.toLocaleString("ko-KR")}만원).`,
    `「${brief.campaignName || brief.industry}」: ${brief.brandName}의 ${goalTitle(brief)} 집행안, OOH·DOOH ${mediaCount}개 매체 기준.`,
  ];
  const overviewVariantsEn: readonly ((b: ProposalNarrativeBrief) => string)[] = [
    (b) => `Proposal for ${b.brandName} — ${b.industry}, OOH-led ${b.goal} plan.`,
    (b) =>
      `${b.brandName} in ${b.industry}: OOH strategy across ${regionsText(b)}, ${mediaCount} placements.`,
  ];
  const marketKo = [
    `${brief.industry} 시장은 디지털 전환과 오프라인 경험의 결합이 가속화되고 있습니다. 타깃(${targetSummary(brief)})은 이동 동선상 반복 노출에 민감합니다.`,
    `${brief.industry} 카테고리에서 ${regionsText(brief)} 소비자는 현장 신뢰·각인과 디지털 후속 행동이 함께 작동합니다. OOH는 ${goalTitle(brief)} 초기 구간에 유리합니다.`,
    `${brief.industry} 경쟁 환경에서 ${regionsText(brief)} 동선 매체는 브랜드 신뢰와 빈도를 동시에 확보하는 수단입니다.`,
  ];
  const marketEn = [
    `${brief.industry} buyers respond to combined offline presence and digital follow-up; OOH supports early-funnel ${brief.goal}.`,
    `In ${brief.industry}, corridor media in ${regionsText(brief)} builds trust and frequency for ${targetSummary(brief)}.`,
  ];

  return {
    overview: pickFromPool(
      ko ? overviewVariantsKo : overviewVariantsEn,
      seed,
      "studio-overview",
    )(brief),
    marketAnalysis: pickFromPool(ko ? marketKo : marketEn, seed, "studio-market"),
    strategy: buildOohStrategyBlock(brief, industryKey, mediaCount, seed),
    expectedOutcomes: buildExpectedOutcomes(brief, "onlyOoh", seed),
    timeline: buildProposalTimeline(brief, seed),
  };
}
