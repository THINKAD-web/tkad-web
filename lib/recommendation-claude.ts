import Anthropic from "@anthropic-ai/sdk";
import type { MatchedMedia, MatchingInput } from "@/lib/matching-engine";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { AI_MODELS } from "@/lib/ai-models";
import { logAiUsage, recordAiUsage } from "@/lib/ai-usage-log";

export type ClaudeEnrichMeta = {
  source: "planner" | "recommend";
  userId?: string | null;
  cached?: boolean;
};

function aiFeatureForSource(source: ClaudeEnrichMeta["source"]): string {
  return source === "planner" ? "planner_recommendation" : "recommendation";
}

function usageNote(meta: ClaudeEnrichMeta, kind: "rerank" | "narrative"): string {
  return [
    `source:${meta.source}`,
    `kind:${kind}`,
    `userId:${meta.userId ?? "anon"}`,
    `cached:${meta.cached ? "true" : "false"}`,
  ].join(" ");
}

function logClaudeUsage(
  meta: ClaudeEnrichMeta,
  kind: "rerank" | "narrative",
  model: string,
  inputTokens: number,
  outputTokens: number,
): void {
  const feature =
    kind === "narrative" ? "planner_proposal_narrative" : aiFeatureForSource(meta.source);
  void logAiUsage({
    type: feature,
    model,
    tokensUsed: inputTokens + outputTokens,
    note: usageNote(meta, kind),
  });
  void recordAiUsage({
    feature,
    model,
    inputTokens,
    outputTokens,
  });
}

export type ClaudeRecommendation = {
  mediaId: string;
  priority: number;
  reasoning: string;
  expectedImpact: string;
  budgetAllocation: number;
};

const anthropic =
  process.env.ANTHROPIC_API_KEY?.trim() ?
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() })
  : null;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw);
}

export async function enrichWithClaude(
  input: MatchingInput,
  candidates: MatchedMedia[],
  isKo: boolean,
  meta: ClaudeEnrichMeta = { source: "recommend", cached: false },
): Promise<MatchedMedia[]> {
  if (!anthropic || candidates.length === 0) return candidates;

  const top = candidates.slice(0, 20);
  const payload = top.map((c) => ({
    mediaId: c.media.id,
    name: c.media.name,
    location: c.media.location,
    type: c.media.type,
    monthlyPriceWon: catalogPriceFieldToWon(c.media.price),
    score: c.score,
    breakdown: c.breakdown,
  }));

  const system = isKo
    ? "당신은 OOH 광고 전문가입니다. 후보 매체와 광고주 조건을 보고 최적 조합을 JSON으로만 답하세요."
    : "You are an OOH advertising expert. Respond with JSON only.";

  const user = `
조건:
- 업종: ${input.industry}
- 월 예산: ${input.monthlyBudgetWon.toLocaleString()}원
- 지역: ${input.regions.join(", ") || "미지정"}
- 타겟: ${input.targets.join(", ") || "mass"}
- 목적: ${input.goal}
- 기간: ${input.durationMonths}개월

후보 매체 (${payload.length}개):
${JSON.stringify(payload, null, 2)}

출력 JSON 형식:
{
  "recommendations": [
    {
      "mediaId": "...",
      "priority": 1,
      "reasoning": "한국어 1–2문장",
      "expectedImpact": "월 노출·도달 추정 1문장",
      "budgetAllocation": 0.4
    }
  ]
}
최대 5개, priority 1이 가장 중요. budgetAllocation 합은 1.0 근사.`;

  try {
    const res = await anthropic.messages.create({
      model: AI_MODELS.recommendation,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: user }],
    });
    logClaudeUsage(
      meta,
      "rerank",
      AI_MODELS.recommendation,
      res.usage?.input_tokens ?? 0,
      res.usage?.output_tokens ?? 0,
    );

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsed = extractJson(text) as {
      recommendations?: ClaudeRecommendation[];
    };
    const recs = parsed.recommendations ?? [];
    if (recs.length === 0) return candidates;

    const byId = new Map(candidates.map((c) => [c.media.id, c]));
    const merged: MatchedMedia[] = [];
    for (const r of recs.sort((a, b) => a.priority - b.priority)) {
      const base = byId.get(r.mediaId);
      if (!base) continue;
      merged.push({
        ...base,
        priority: r.priority,
        reasoning: r.reasoning,
        expectedImpact: r.expectedImpact,
        budgetAllocation: r.budgetAllocation,
        role:
          r.priority === 1 ? "main"
          : r.priority <= 3 ? "sub"
          : "booster",
      });
    }
    for (const c of candidates) {
      if (!merged.some((m) => m.media.id === c.media.id)) merged.push(c);
    }
    return merged.slice(0, candidates.length);
  } catch (e) {
    console.warn("[recommendation-claude] fallback to algorithm only", e);
    return candidates;
  }
}

export type PlannerPortfolioLine = {
  mediaId: string;
  name: string;
  type: string;
  monthlyPriceWon: number;
  role?: string;
};

/** Step 6/7 제안 논리 — 목표·타깃·매체·예산 4문장. 실패 시 null. */
export async function generatePlannerProposalNarrative(
  input: MatchingInput,
  portfolio: PlannerPortfolioLine[],
  isKo: boolean,
  meta: ClaudeEnrichMeta = { source: "planner", cached: false },
): Promise<string[] | null> {
  if (!anthropic || portfolio.length === 0) return null;

  const system = isKo
    ? "당신은 OOH 미디어 플래너입니다. 광고주 조건과 선정 매체 포트폴리오를 바탕으로 제안 논리를 JSON으로만 답하세요."
    : "You are an OOH media planner. Respond with JSON only.";

  const user = `
조건:
- 업종: ${input.industry}
- 월 예산: ${input.monthlyBudgetWon.toLocaleString()}원 (총 ${input.durationMonths}개월)
- 지역: ${input.regions.join(", ") || "미지정"}
- 타겟: ${input.targets.join(", ") || "mass"}
- 목적: ${input.goal}
${input.goalTags?.length ? `- 목표 태그: ${input.goalTags.join(", ")}` : ""}

선정 매체 (${portfolio.length}개):
${JSON.stringify(portfolio, null, 2)}

출력 JSON 형식 (정확히 4문장):
{
  "sentences": [
    "1문장: 캠페인 목표와 의도",
    "2문장: 타깃·지역 전략",
    "3문장: 매체 믹스와 역할 (유형·배치 비중)",
    "4문장: 예산·기간 대비 기대 효과"
  ]
}
각 문장은 ${isKo ? "한국어" : "English"}, 1–2줄 이내.`;

  try {
    const res = await anthropic.messages.create({
      model: AI_MODELS.recommendation,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: user }],
    });
    logClaudeUsage(
      meta,
      "narrative",
      AI_MODELS.recommendation,
      res.usage?.input_tokens ?? 0,
      res.usage?.output_tokens ?? 0,
    );

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsed = extractJson(text) as { sentences?: string[] };
    const sentences = (parsed.sentences ?? []).filter(
      (s) => typeof s === "string" && s.trim().length > 0,
    );
    return sentences.length >= 3 ? sentences.slice(0, 4) : null;
  } catch (e) {
    console.warn("[recommendation-claude] proposal narrative fallback", e);
    return null;
  }
}
