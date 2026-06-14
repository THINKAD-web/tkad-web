import Anthropic from "@anthropic-ai/sdk";
import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  getAnthropicClient,
  resolveModel,
} from "@/lib/ai-content-generator";
import {
  OOH_EXPERT_PERSONA,
  OOH_EXPERT_STRUCTURED_OUTPUT_RULES,
  withOohExpertContext,
} from "@/lib/ai-ooh-expert";
import {
  type CampaignProposalOutput,
  type GeneralProposalOutput,
  type ProposalInput,
  type ProposalSectionType,
  type ProposalType,
  type StudioProposalInput,
  generalProposalOutputSchema,
  proposalOutputSchema,
  sectionsForType,
} from "@/lib/proposal/types";

const PROPOSAL_TOOL = "emit_campaign_proposal" as const;

const PROPOSAL_TOOL_SCHEMA = {
  name: PROPOSAL_TOOL,
  description:
    "Submit a complete OOH/DOOH campaign proposal draft for client review.",
  input_schema: {
    type: "object" as const,
    properties: {
      overview: { type: "string", description: "Campaign overview (2-4 paragraphs KO)" },
      strategy: { type: "string", description: "Strategic direction and rationale" },
      mediaMix: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mediaId: { type: "string" },
            mediaName: { type: "string" },
            role: { type: "string" },
            rationale: { type: "string" },
            budgetSharePct: { type: "number" },
          },
          required: ["mediaId", "mediaName", "role", "rationale", "budgetSharePct"],
        },
      },
      budgetAllocation: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            amountWon: { type: "number" },
            sharePct: { type: "number" },
          },
          required: ["label", "amountWon", "sharePct"],
        },
      },
      metrics: {
        type: "object",
        properties: {
          estimatedImpressions: { type: "integer" },
          estimatedReach: { type: "integer" },
          estimatedCpm: { type: "integer" },
        },
        required: ["estimatedImpressions", "estimatedReach", "estimatedCpm"],
      },
      timeline: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phase: { type: "string" },
            period: { type: "string" },
            tasks: { type: "array", items: { type: "string" } },
          },
          required: ["phase", "period", "tasks"],
        },
      },
      expectedOutcomes: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "overview",
      "strategy",
      "mediaMix",
      "budgetAllocation",
      "metrics",
      "timeline",
      "expectedOutcomes",
    ],
  },
};

function extractToolInput(message: Anthropic.Message): unknown {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === PROPOSAL_TOOL) {
      return block.input;
    }
  }
  throw new Error(`Model did not return tool "${PROPOSAL_TOOL}".`);
}

function goalLabelKo(goal: ProposalInput["goal"]): string {
  switch (goal) {
    case "awareness":
      return "브랜드 인지도";
    case "conversion":
      return "전환·실적";
    case "event":
      return "이벤트·프로모션";
  }
}

function buildMediaCatalogBlock(media: MediaItem[]): string {
  return media
    .map((m) => {
      const won = catalogPriceFieldToWon(m.price);
      return [
        `id=${m.id}`,
        `name=${m.name}`,
        `type=${m.type}`,
        `region=${m.region}`,
        `district=${m.district ?? ""}`,
        `priceWon=${won}`,
        `period=${m.pricePeriod ?? "month"}`,
        `footTraffic=${m.dailyFootTraffic ?? "n/a"}`,
        `visibility=${m.visibilityScore ?? "n/a"}`,
      ].join(" | ");
    })
    .join("\n");
}

function buildUserPrompt(
  input: ProposalInput,
  selectedMedia: MediaItem[],
): string {
  const isKo = input.locale !== "en";
  const budgetWon = input.budgetManwon * 10_000;

  return `다음 브리프로 **OOH/DOOH 캠페인 제안서** 초안을 작성하세요. 한국어 본문(overview, strategy, rationale 등)을 기본으로 하되, locale이 en이면 영문으로 작성합니다.

## 브리프
- 브랜드: ${input.brandName}
- 업종: ${input.industry}
- 캠페인 명: ${input.campaignName}
- 목적: ${isKo ? goalLabelKo(input.goal) : input.goal}
- 집행: ${input.startDate} ~ ${input.endDate}
- 총 예산: ${input.budgetManwon.toLocaleString(isKo ? "ko-KR" : "en-US")}만원 (약 ${budgetWon.toLocaleString(isKo ? "ko-KR" : "en-US")}원)
- 희망 지역: ${input.regions.join(", ")}
- 타겟 연령: ${input.targetAge || (isKo ? "미지정" : "unspecified")}
- 타겟 성별: ${input.targetGender || (isKo ? "전체" : "all")}
- 관심사: ${input.targetInterests || (isKo ? "미지정" : "unspecified")}

## 선정·추천 매체 (반드시 mediaMix에 포함, mediaId는 아래 id 그대로)
${buildMediaCatalogBlock(selectedMedia)}

## 작성 지침
1. overview: 캠페인 개요·배경·한 줄 포지셔닝
2. strategy: 전략 방향·타깃 접근·OOH/DOOH 활용 논리
3. mediaMix: 위 매체별 role(예: 메인 노출, 상권 보조), 선정 이유, budgetSharePct 합계 100
4. budgetAllocation: 매체비·제작·운영 등 행별 amountWon(원 단위 정수), sharePct 합 100
5. metrics: estimatedImpressions, estimatedReach, estimatedCpm(원) — 합리적 추정, 과장 금지
6. timeline: 집행 전·중·후 단계별 phase, period, tasks
7. expectedOutcomes: 기대 효과 4~6개 bullet 수준의 문장

반드시 tool \`${PROPOSAL_TOOL}\` 한 번만 호출하세요.`;
}

/** 규칙 기반 폴백 (API 키 없음·오류 시) */
export function buildFallbackProposal(
  input: ProposalInput,
  selectedMedia: MediaItem[],
): CampaignProposalOutput {
  const isKo = input.locale !== "en";
  const totalWon = input.budgetManwon * 10_000;
  const shareEach = Math.floor(100 / selectedMedia.length);
  const remainder = 100 - shareEach * selectedMedia.length;

  const mediaMix = selectedMedia.map((m, i) => ({
    mediaId: m.id,
    mediaName: m.name,
    role: i === 0 ? (isKo ? "메인 노출" : "Hero placement") : isKo ? "보조 매체" : "Support",
    rationale: isKo
      ? `${input.regions.join(", ")} 타깃과 ${goalLabelKo(input.goal)} 목적에 맞춘 ${m.type} 매체입니다.`
      : `Fits ${input.goal} goal in ${input.regions.join(", ")} as ${m.type}.`,
    budgetSharePct: shareEach + (i === 0 ? remainder : 0),
  }));

  const budgetAllocation = mediaMix.map((row) => ({
    label: row.mediaName,
    amountWon: Math.round((totalWon * row.budgetSharePct) / 100),
    sharePct: row.budgetSharePct,
  }));

  const totalFoot = selectedMedia.reduce(
    (s, m) => s + (m.dailyFootTraffic ?? 5000),
    0,
  );
  const days = Math.max(
    1,
    Math.round(
      (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) /
        86400000,
    ) + 1,
  );
  const estimatedImpressions = Math.round(totalFoot * days * 1.2);
  const estimatedReach = Math.round(estimatedImpressions * 0.35);
  const estimatedCpm =
    estimatedImpressions > 0
      ? Math.round((totalWon / estimatedImpressions) * 1000)
      : 0;

  return {
    overview: isKo
      ? `${input.brandName}의 「${input.campaignName}」 캠페인은 ${input.startDate}부터 ${input.endDate}까지 ${input.regions.join(", ")} 중심으로 집행하는 ${goalLabelKo(input.goal)} 캠페인입니다. 총 예산 ${input.budgetManwon.toLocaleString("ko-KR")}만원 규모로 OOH·DOOH 믹스를 통해 타깃에게 반복 노출을 설계합니다.`
      : `${input.brandName} — "${input.campaignName}" runs ${input.startDate}–${input.endDate} across ${input.regions.join(", ")} with a ${input.budgetManwon}×10k KRW budget focused on ${input.goal}.`,
    strategy: isKo
      ? `핵심 타깃(${input.targetAge || "전 연령"}, ${input.targetGender || "전체"})에게 상권·동선 기반 노출을 우선하고, 인지 → 관심 → 방문(또는 참여) 퍼널에 맞춰 매체 역할을 분리합니다.`
      : `Prioritize corridor and district visibility for ${input.targetAge || "broad"} audiences; separate hero vs support placements along the awareness funnel.`,
    mediaMix,
    budgetAllocation,
    metrics: { estimatedImpressions, estimatedReach, estimatedCpm },
    timeline: [
      {
        phase: isKo ? "사전 준비" : "Pre-flight",
        period: isKo ? "집행 2~3주 전" : "2–3 weeks before launch",
        tasks: isKo
          ? ["소재 가이드 확정", "매체 예약·견적 확정", "집행 일정 LOCK"]
          : ["Creative specs", "Booking confirmation", "Schedule lock"],
      },
      {
        phase: isKo ? "집행" : "Flight",
        period: `${input.startDate} ~ ${input.endDate}`,
        tasks: isKo
          ? ["송출·설치 모니터링", "현장 사진·리포트"]
          : ["Monitoring", "Proof of posting"],
      },
      {
        phase: isKo ? "사후" : "Post-flight",
        period: isKo ? "종료 후 1주" : "Within 1 week after end",
        tasks: isKo
          ? ["성과 요약", "차기 캠페인 제안"]
          : ["Performance wrap-up", "Next-step proposal"],
      },
    ],
    expectedOutcomes: isKo
      ? [
          "타깃 상권 내 브랜드 인지도 상승",
          "디지털·오프라인 연계 시 검색·방문 증가 기대",
          "반복 노출을 통한 메시지 리콜 강화",
          "집행 구간별 효율 데이터 확보",
        ]
      : [
          "Stronger brand recall in target districts",
          "Uplift in search or store visits when paired with digital",
          "Consistent message frequency across the flight",
          "Actionable data for the next flight",
        ],
  };
}

export async function generateCampaignProposal(
  input: ProposalInput,
  selectedMedia: MediaItem[],
): Promise<CampaignProposalOutput> {
  if (selectedMedia.length === 0) {
    throw new Error("At least one media item is required.");
  }

  const hasKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!hasKey) {
    return buildFallbackProposal(input, selectedMedia);
  }

  const client = getAnthropicClient();
  const model = resolveModel();
  const system = withOohExpertContext(
    `${OOH_EXPERT_PERSONA}\n\n${OOH_EXPERT_STRUCTURED_OUTPUT_RULES}\n\nYou draft client-ready OOH campaign proposals for THINKAD (싱커드). Use only the provided media IDs in mediaMix.`,
  );

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    tools: [PROPOSAL_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: PROPOSAL_TOOL },
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input, selectedMedia),
      },
    ],
  });

  const raw = extractToolInput(message);
  const parsed = proposalOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[proposal] schema parse failed, using fallback", parsed.error);
    return buildFallbackProposal(input, selectedMedia);
  }

  const allowedIds = new Set(selectedMedia.map((m) => m.id));
  const mediaMix = parsed.data.mediaMix.filter((row) =>
    allowedIds.has(row.mediaId),
  );
  if (mediaMix.length === 0) {
    return buildFallbackProposal(input, selectedMedia);
  }

  return { ...parsed.data, mediaMix };
}

// ─────────────────────────────────────────────────────────────
// 범용(유형별) 제안서 생성
// ─────────────────────────────────────────────────────────────

const GENERAL_TOOL = "emit_proposal" as const;

type CaseRef = { title: string; summary: string; result?: string };

// 섹션 → 툴 input property
const SECTION_TOOL_PROPS: Record<ProposalSectionType, Record<string, unknown>> = {
  cover: { overview: { type: "string", description: "제안 개요 2-4문단 (KO 기본)" } },
  market_analysis: {
    marketAnalysis: { type: "string", description: "시장 현황·트렌드·타깃 특성 3-4문단" },
  },
  strategy: { strategy: { type: "string", description: "전략 방향·실행 논리" } },
  media_recommend: {
    mediaMix: {
      type: "array",
      items: {
        type: "object",
        properties: {
          mediaId: { type: "string" },
          mediaName: { type: "string" },
          role: { type: "string" },
          rationale: { type: "string" },
          budgetSharePct: { type: "number" },
        },
        required: ["mediaId", "mediaName", "role", "rationale", "budgetSharePct"],
      },
    },
  },
  competitor: {
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          approach: { type: "string" },
          differentiation: { type: "string" },
        },
        required: ["name", "approach", "differentiation"],
      },
    },
  },
  case_study: {
    caseStudies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          result: { type: "string" },
        },
        required: ["title", "summary"],
      },
    },
  },
  roi_scenario: {
    roiScenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scenario: { type: "string", enum: ["conservative", "base", "aggressive"] },
          label: { type: "string" },
          impressions: { type: "integer" },
          reach: { type: "integer" },
          conversions: { type: "integer" },
          note: { type: "string" },
        },
        required: ["scenario", "label", "impressions", "reach"],
      },
    },
  },
  budget: {
    budgetAllocation: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          amountWon: { type: "integer" },
          sharePct: { type: "number" },
        },
        required: ["label", "amountWon", "sharePct"],
      },
    },
    metrics: {
      type: "object",
      properties: {
        estimatedImpressions: { type: "integer" },
        estimatedReach: { type: "integer" },
        estimatedCpm: { type: "integer" },
      },
      required: ["estimatedImpressions", "estimatedReach", "estimatedCpm"],
    },
  },
  timeline: {
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phase: { type: "string" },
          period: { type: "string" },
          tasks: { type: "array", items: { type: "string" } },
        },
        required: ["phase", "period", "tasks"],
      },
    },
    expectedOutcomes: { type: "array", items: { type: "string" } },
  },
  appendix: { appendix: { type: "string", description: "부록·참고·용어 등" } },
};

// 섹션 → 프롬프트 지침
function sectionPrompt(
  section: ProposalSectionType,
  input: StudioProposalInput,
): string {
  const budgetWon = (input.budgetManwon || 0) * 10_000;
  switch (section) {
    case "cover":
      return "overview: 제안 배경·목적·한 줄 포지셔닝";
    case "market_analysis":
      return `marketAnalysis: ${input.industry} 시장의 현황·트렌드·타겟 고객 특성을 제안서용으로 분석(데이터 기반, 3-4문단)`;
    case "strategy":
      return "strategy: 목적 달성을 위한 마케팅 전략. OOH 중심 + 온·오프라인 통합 관점, 실행 가능하게";
    case "media_recommend":
      return "mediaMix: 제공된 매체 id 그대로 사용. 매체별 role·rationale·budgetSharePct(합 100)";
    case "competitor":
      return `competitors: ${input.industry} 주요 경쟁사 3~5곳의 마케팅 접근(approach)과 차별화 포인트(differentiation)를 객관적으로`;
    case "case_study":
      return "caseStudies: 아래 '참고 사례'에서 관련성 높은 사례를 인용·요약(title·summary·result). 없으면 업종 일반 사례 1~2개";
    case "roi_scenario":
      return `roiScenarios: 예산 ${budgetWon.toLocaleString("ko-KR")}원 기준 보수(conservative)·기본(base)·공격(aggressive) 3케이스의 impressions·reach·conversions·note`;
    case "budget":
      return "budgetAllocation: 매체비·제작·운영 등 행별 amountWon(원 정수)·sharePct(합100). metrics: estimatedImpressions·reach·cpm(원)";
    case "timeline":
      return "timeline: 사전·집행·사후 단계별 phase·period·tasks. expectedOutcomes: 기대효과 4~6개";
    case "appendix":
      return "appendix: 참고·전제·용어 정리(간단히)";
  }
}

function buildGeneralTool(sections: ProposalSectionType[]) {
  const properties: Record<string, unknown> = {};
  for (const s of sections) Object.assign(properties, SECTION_TOOL_PROPS[s]);
  return {
    name: GENERAL_TOOL,
    description: "Submit a complete client-ready proposal draft for the requested type.",
    input_schema: { type: "object" as const, properties },
  };
}

function buildGeneralPrompt(
  input: StudioProposalInput,
  type: ProposalType,
  sections: ProposalSectionType[],
  selectedMedia: MediaItem[],
  cases: CaseRef[],
): string {
  const isKo = input.locale !== "en";
  const budgetWon = (input.budgetManwon || 0) * 10_000;
  const mediaBlock = selectedMedia.length
    ? buildMediaCatalogBlock(selectedMedia)
    : "(선정 매체 없음 — media_recommend 섹션이 있으면 업종/지역에 맞는 일반 매체 유형으로 제안)";
  const caseBlock = cases.length
    ? cases
        .map((c, i) => `${i + 1}. ${c.title} — ${c.summary}${c.result ? ` (성과: ${c.result})` : ""}`)
        .join("\n")
    : "(DB 사례 없음)";

  return `다음 브리프로 **${type} 유형 제안서** 초안을 작성하세요. 한국어 본문 기본(locale=en 이면 영문).

## 브리프
- 브랜드/주체: ${input.brandName}
- 업종: ${input.industry}
- 제안명: ${input.campaignName || "(미지정)"}
- 목적: ${input.goal ? (isKo ? goalLabelKo(input.goal) : input.goal) : "(미지정)"}
- 기간: ${input.startDate ?? "?"} ~ ${input.endDate ?? "?"}
- 예산: ${(input.budgetManwon || 0).toLocaleString("ko-KR")}만원 (약 ${budgetWon.toLocaleString("ko-KR")}원)
- 지역: ${input.regions.length ? input.regions.join(", ") : "(미지정)"}
- 타깃: 연령 ${input.targetAge || "미지정"} / 성별 ${input.targetGender || "전체"} / 관심사 ${input.targetInterests || "미지정"}
- 자유 요청: ${input.freeRequest || "(없음)"}

## 선정·추천 매체 (mediaMix는 아래 id 그대로)
${mediaBlock}

## 참고 사례 (case_study 섹션용)
${caseBlock}

## 채울 섹션 (이 항목만 출력)
${sections.map((s) => `- ${sectionPrompt(s, input)}`).join("\n")}

반드시 tool \`${GENERAL_TOOL}\` 한 번만 호출하세요. 위 섹션에 해당하는 필드만 채웁니다.`;
}

function extractGeneralToolInput(message: Anthropic.Message): unknown {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === GENERAL_TOOL) return block.input;
  }
  throw new Error(`Model did not return tool "${GENERAL_TOOL}".`);
}

/** 규칙 기반 범용 폴백 (API 키 없음·오류·파싱 실패 시) */
export function buildGeneralFallback(
  input: StudioProposalInput,
  type: ProposalType,
  sections: ProposalSectionType[],
  selectedMedia: MediaItem[],
  cases: CaseRef[],
): GeneralProposalOutput {
  const has = (s: ProposalSectionType) => sections.includes(s);
  const out: GeneralProposalOutput = {};
  const totalWon = (input.budgetManwon || 0) * 10_000;

  if (has("cover"))
    out.overview = `${input.brandName}의 ${input.campaignName || input.industry} 제안서입니다. ${input.industry} 시장에서 ${input.goal ? goalLabelKo(input.goal) : "성과"}를 목표로 OOH 중심 전략을 제시합니다.`;
  if (has("market_analysis"))
    out.marketAnalysis = `${input.industry} 시장은 디지털 전환과 오프라인 경험의 결합이 가속화되고 있습니다. 타깃(${input.targetAge || "전 연령"})은 이동 동선상 반복 노출에 민감하며, OOH는 신뢰·각인 측면에서 강점을 가집니다.`;
  if (has("strategy"))
    out.strategy = `핵심 상권·동선 중심으로 OOH 노출을 설계하고, 디지털 리타깃과 연계해 인지→관심→행동 퍼널을 강화합니다.`;
  if (has("media_recommend") && selectedMedia.length) {
    const each = Math.floor(100 / selectedMedia.length);
    out.mediaMix = selectedMedia.map((m, i) => ({
      mediaId: m.id,
      mediaName: m.name,
      role: i === 0 ? "메인 노출" : "보조 매체",
      rationale: `${input.regions.join(", ") || "타깃 지역"} ${m.type} 매체`,
      budgetSharePct: each + (i === 0 ? 100 - each * selectedMedia.length : 0),
    }));
  }
  if (has("competitor"))
    out.competitors = [
      { name: "경쟁사 A", approach: "대형 디지털 위주", differentiation: "현장 검증 데이터 부족" },
      { name: "경쟁사 B", approach: "가격 경쟁", differentiation: "통합 집행·리포트 미흡" },
    ];
  if (has("case_study"))
    out.caseStudies = (cases.length ? cases : [{ title: `${input.industry} 캠페인`, summary: "유사 업종 OOH 집행", result: "브랜드 인지 상승" }]).slice(0, 3);
  if (has("roi_scenario")) {
    const base = Math.max(10000, totalWon / 10);
    out.roiScenarios = [
      { scenario: "conservative", label: "보수", impressions: Math.round(base * 8), reach: Math.round(base * 3), note: "최소 가정" },
      { scenario: "base", label: "기본", impressions: Math.round(base * 12), reach: Math.round(base * 4), note: "표준 가정" },
      { scenario: "aggressive", label: "공격", impressions: Math.round(base * 18), reach: Math.round(base * 6), note: "최대 가정" },
    ];
  }
  if (has("budget")) {
    out.budgetAllocation = [
      { label: "매체비", amountWon: Math.round(totalWon * 0.7), sharePct: 70 },
      { label: "제작·운영", amountWon: Math.round(totalWon * 0.2), sharePct: 20 },
      { label: "예비", amountWon: Math.round(totalWon * 0.1), sharePct: 10 },
    ];
    out.metrics = {
      estimatedImpressions: Math.round(Math.max(1, totalWon) / 8),
      estimatedReach: Math.round(Math.max(1, totalWon) / 24),
      estimatedCpm: 8000,
    };
  }
  if (has("timeline")) {
    out.timeline = [
      { phase: "사전 준비", period: "집행 2~3주 전", tasks: ["소재 확정", "매체 예약"] },
      { phase: "집행", period: `${input.startDate ?? ""} ~ ${input.endDate ?? ""}`.trim() || "집행 기간", tasks: ["모니터링", "현장 리포트"] },
      { phase: "사후", period: "종료 후 1주", tasks: ["성과 요약", "차기 제안"] },
    ];
    out.expectedOutcomes = ["브랜드 인지 상승", "검색·방문 증가", "메시지 리콜 강화", "효율 데이터 확보"];
  }
  if (has("appendix"))
    out.appendix = "본 제안은 추정치를 포함하며 실제 집행 결과와 다를 수 있습니다.";
  return out;
}

/** 범용 제안서 생성 — 유형별 섹션만 동적으로 요청. */
export async function generateProposal(
  input: StudioProposalInput,
  selectedMedia: MediaItem[],
  cases: CaseRef[] = [],
): Promise<{ type: ProposalType; sections: ProposalSectionType[]; output: GeneralProposalOutput }> {
  const type = input.type;
  const sections = sectionsForType(type);

  const hasKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!hasKey) {
    return { type, sections, output: buildGeneralFallback(input, type, sections, selectedMedia, cases) };
  }

  try {
    const client = getAnthropicClient();
    const model = resolveModel();
    const system = withOohExpertContext(
      `${OOH_EXPERT_PERSONA}\n\n${OOH_EXPERT_STRUCTURED_OUTPUT_RULES}\n\nYou draft client-ready proposals for THINKAD (싱커드). Use only the provided media IDs in mediaMix. Fill ONLY the requested sections.`,
    );
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      tools: [buildGeneralTool(sections)],
      tool_choice: { type: "tool", name: GENERAL_TOOL },
      messages: [
        { role: "user", content: buildGeneralPrompt(input, type, sections, selectedMedia, cases) },
      ],
    });
    const raw = extractGeneralToolInput(message);
    const parsed = generalProposalOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { type, sections, output: buildGeneralFallback(input, type, sections, selectedMedia, cases) };
    }
    // mediaMix는 허용 id로 필터
    let output = parsed.data;
    if (output.mediaMix && selectedMedia.length) {
      const allowed = new Set(selectedMedia.map((m) => m.id));
      output = { ...output, mediaMix: output.mediaMix.filter((r) => allowed.has(r.mediaId)) };
    }
    return { type, sections, output };
  } catch (e) {
    console.warn("[proposal] general generate failed, fallback", e instanceof Error ? e.message : e);
    return { type, sections, output: buildGeneralFallback(input, type, sections, selectedMedia, cases) };
  }
}
