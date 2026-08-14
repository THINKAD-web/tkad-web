import type { EngineInput } from "./types";
import { getEngine } from "./get-engine";

export function computeMetric(input: EngineInput) {
  const engine = getEngine();
  if (!engine.canProcess(input)) {
    throw new Error(
      `Engine ${engine.version} cannot process media ${input.mediaId} — no legacy values, no stored metrics`,
    );
  }
  return {
    output: engine.compute(input),
    engineVersion: engine.version,
  };
}
