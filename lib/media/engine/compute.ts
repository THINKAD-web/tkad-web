import type { EngineInput } from "./types";
import { selectEngine } from "./get-engine";

export function computeMetric(input: EngineInput) {
  const engine = selectEngine(input);
  if (!engine.canProcess(input)) {
    throw new Error(
      `Engine ${engine.version} cannot process media ${input.mediaId}`,
    );
  }
  return {
    output: engine.compute(input),
    engineVersion: engine.version,
  };
}
