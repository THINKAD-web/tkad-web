import Anthropic from "@anthropic-ai/sdk";
import type { MatchedMedia, MatchingInput } from "@/lib/matching-engine";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { ANTHROPIC_DEFAULT_MODEL } from "@/lib/ai-content-generator";

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
      model: process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_DEFAULT_MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: user }],
    });

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
