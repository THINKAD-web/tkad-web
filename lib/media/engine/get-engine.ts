import type { MetricEngine } from "./types";
import { v0FallbackEngine } from "./v0-fallback";

const ACTIVE_ENGINE: MetricEngine = v0FallbackEngine;

export function getEngine(): MetricEngine {
  return ACTIVE_ENGINE;
}
