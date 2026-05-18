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
  type ProposalInput,
  proposalOutputSchema,
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
