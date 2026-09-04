import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { IntegratedMixFetchResult } from "@/lib/integrated/client-mix";
import type { DigitalAllocationSource } from "@/components/planner/brief/allocation-source-badge";

export function resolveAllocationSource(params: {
  mix: IntegratedMixResponse | null;
  mixLoading: boolean;
  mixError: Extract<IntegratedMixFetchResult, { ok: false }> | null;
}): DigitalAllocationSource | null {
  if (params.mixLoading && !params.mix) return null;
  if (params.mix) return "live";
  return "benchmark";
}
