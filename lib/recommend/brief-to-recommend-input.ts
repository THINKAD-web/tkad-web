import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { buildAiRecommendInputFromFreetextRaw } from "@/lib/recommend/build-freetext-recommend-input";

/** Rule-based brief → recommend API input (0 tokens). Missing fields use safe defaults. */
export function buildRecommendInputFromBriefRaw(
  raw: string,
  isKo: boolean,
): AiRecommendInput | null {
  return buildAiRecommendInputFromFreetextRaw(raw, isKo);
}
