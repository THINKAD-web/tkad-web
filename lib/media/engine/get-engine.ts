import type { EngineInput, MetricEngine } from "./types";
import { v0FallbackEngine } from "./v0-fallback";
import { v1ImpressionsEngine } from "./v1-impressions";

const ENGINES: MetricEngine[] = [v1ImpressionsEngine, v0FallbackEngine];

export function selectEngine(input: EngineInput): MetricEngine {
  for (const engine of ENGINES) {
    if (engine.canProcess(input)) return engine;
  }
  throw new Error(
    `No engine can process media ${input.mediaId} — missing footfall and legacy values`,
  );
}

/** @deprecated use selectEngine — kept for callers that expect a single engine */
export function getEngine(): MetricEngine {
  return v1ImpressionsEngine;
}

export { v0FallbackEngine, v1ImpressionsEngine };
