import { z } from "zod";

export const PROPOSAL_GOALS = ["awareness", "conversion", "event"] as const;
export type ProposalGoal = (typeof PROPOSAL_GOALS)[number];

export const proposalInputSchema = z.object({
  brandName: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  campaignName: z.string().min(1).max(160),
  targetAge: z.string().max(80).optional().default(""),
  targetGender: z.string().max(40).optional().default(""),
  targetInterests: z.string().max(300).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budgetManwon: z.number().int().min(100).max(100_000),
  goal: z.enum(PROPOSAL_GOALS),
  regions: z.array(z.string().min(1)).min(1).max(12),
  mediaIds: z.array(z.string().min(1)).min(1).max(20),
  loadedPlanId: z.string().optional().nullable(),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

export const proposalMediaMixItemSchema = z.object({
  mediaId: z.string(),
  mediaName: z.string(),
  role: z.string(),
  rationale: z.string(),
  budgetSharePct: z.number().min(0).max(100),
});

export const proposalBudgetRowSchema = z.object({
  label: z.string(),
  amountWon: z.number().int().min(0),
  sharePct: z.number().min(0).max(100),
});

export const proposalTimelineItemSchema = z.object({
  phase: z.string(),
  period: z.string(),
  tasks: z.array(z.string()).min(1),
});

export const proposalOutputSchema = z.object({
  overview: z.string(),
  strategy: z.string(),
  mediaMix: z.array(proposalMediaMixItemSchema).min(1),
  budgetAllocation: z.array(proposalBudgetRowSchema).min(1),
  metrics: z.object({
    estimatedImpressions: z.number().int().min(0),
    estimatedReach: z.number().int().min(0),
    estimatedCpm: z.number().int().min(0),
  }),
  timeline: z.array(proposalTimelineItemSchema).min(1),
  expectedOutcomes: z.array(z.string()).min(1),
});

export type CampaignProposalOutput = z.infer<typeof proposalOutputSchema>;

export const PROPOSAL_ID_RE = /^c[a-z0-9]{24,}$/i;

export function isSavedCampaignProposalId(id: string): boolean {
  return PROPOSAL_ID_RE.test(id.trim());
}

// ─────────────────────────────────────────────────────────────
// 범용 제안서 (유형 추상화 + 유형별 섹션 템플릿)
// ─────────────────────────────────────────────────────────────

export const PROPOSAL_TYPES = [
  "campaign", // OOH 캠페인 제안 (기존)
  "integrated", // 통합 마케팅 제안
  "media_sales", // 매체 영업 제안
  "industry", // 업종별 마케팅 제안
  "custom", // 자유 양식
] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_SECTION_TYPES = [
  "cover",
  "market_analysis",
  "strategy",
  "media_recommend",
  "competitor",
  "case_study",
  "roi_scenario",
  "budget",
  "timeline",
  "appendix",
] as const;
export type ProposalSectionType = (typeof PROPOSAL_SECTION_TYPES)[number];

/** 유형별 기본 섹션 구성 (순서 = 렌더 순서) */
export const PROPOSAL_TEMPLATES: Record<ProposalType, ProposalSectionType[]> = {
  campaign: ["cover", "strategy", "media_recommend", "budget", "timeline"],
  integrated: [
    "cover",
    "market_analysis",
    "strategy",
    "media_recommend",
    "roi_scenario",
    "budget",
    "timeline",
  ],
  industry: [
    "cover",
    "market_analysis",
    "competitor",
    "strategy",
    "media_recommend",
    "case_study",
    "budget",
  ],
  media_sales: ["cover", "media_recommend", "case_study", "roi_scenario", "budget"],
  custom: ["cover", "strategy"],
};

export const PROPOSAL_TYPE_META: Record<
  ProposalType,
  { ko: string; en: string; descKo: string; emoji: string }
> = {
  campaign: { ko: "OOH 캠페인", en: "OOH Campaign", descKo: "매체 믹스 중심 캠페인 제안", emoji: "📣" },
  integrated: { ko: "통합 마케팅", en: "Integrated", descKo: "시장분석·ROI 포함 통합 제안", emoji: "🌐" },
  industry: { ko: "업종별 제안", en: "Industry", descKo: "경쟁사·사례 포함 업종 맞춤", emoji: "🏷️" },
  media_sales: { ko: "매체 영업", en: "Media Sales", descKo: "매체 세일즈·ROI 제안", emoji: "💼" },
  custom: { ko: "자유 양식", en: "Custom", descKo: "요청 기반 자유 구성", emoji: "✍️" },
};

export const PROPOSAL_SECTION_META: Record<
  ProposalSectionType,
  { ko: string; en: string }
> = {
  cover: { ko: "표지·개요", en: "Cover & Overview" },
  market_analysis: { ko: "시장 분석", en: "Market Analysis" },
  strategy: { ko: "전략 방향", en: "Strategy" },
  media_recommend: { ko: "추천 매체", en: "Media Recommendation" },
  competitor: { ko: "경쟁사 분석", en: "Competitor Analysis" },
  case_study: { ko: "성공 사례", en: "Case Studies" },
  roi_scenario: { ko: "ROI 시나리오", en: "ROI Scenarios" },
  budget: { ko: "예산 배분", en: "Budget" },
  timeline: { ko: "집행 타임라인", en: "Timeline" },
  appendix: { ko: "부록", en: "Appendix" },
};

export function sectionsForType(type: ProposalType): ProposalSectionType[] {
  return PROPOSAL_TEMPLATES[type] ?? PROPOSAL_TEMPLATES.campaign;
}

/** 범용 제안서 입력 — 유형별로 일부 필드는 비어도 됨 */
export const studioProposalInputSchema = z.object({
  type: z.enum(PROPOSAL_TYPES).default("campaign"),
  brandName: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  campaignName: z.string().max(160).optional().default(""),
  targetAge: z.string().max(80).optional().default(""),
  targetGender: z.string().max(40).optional().default(""),
  targetInterests: z.string().max(300).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budgetManwon: z.number().int().min(0).max(100_000).default(0),
  goal: z.enum(PROPOSAL_GOALS).optional().default("awareness"),
  regions: z.array(z.string().min(1)).max(12).default([]),
  mediaIds: z.array(z.string().min(1)).max(20).default([]),
  freeRequest: z.string().max(2000).optional().default(""),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});
export type StudioProposalInput = z.infer<typeof studioProposalInputSchema>;

// 신규 섹션 스키마
export const proposalCompetitorSchema = z.object({
  name: z.string(),
  approach: z.string(),
  differentiation: z.string(),
});
export const proposalRoiScenarioSchema = z.object({
  scenario: z.enum(["conservative", "base", "aggressive"]),
  label: z.string(),
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  conversions: z.number().int().min(0).optional(),
  note: z.string().optional(),
});
export const proposalCaseStudySchema = z.object({
  title: z.string(),
  summary: z.string(),
  result: z.string().optional(),
});

/** 범용 출력 — 모든 섹션 optional (유형/템플릿이 어떤 섹션을 채울지 결정) */
export const generalProposalOutputSchema = z.object({
  overview: z.string().optional(),
  marketAnalysis: z.string().optional(),
  strategy: z.string().optional(),
  mediaMix: z.array(proposalMediaMixItemSchema).optional(),
  competitors: z.array(proposalCompetitorSchema).optional(),
  caseStudies: z.array(proposalCaseStudySchema).optional(),
  roiScenarios: z.array(proposalRoiScenarioSchema).optional(),
  budgetAllocation: z.array(proposalBudgetRowSchema).optional(),
  metrics: z
    .object({
      estimatedImpressions: z.number().int().min(0),
      estimatedReach: z.number().int().min(0),
      estimatedCpm: z.number().int().min(0),
    })
    .optional(),
  timeline: z.array(proposalTimelineItemSchema).optional(),
  expectedOutcomes: z.array(z.string()).optional(),
  appendix: z.string().optional(),
});
export type GeneralProposalOutput = z.infer<typeof generalProposalOutputSchema>;
