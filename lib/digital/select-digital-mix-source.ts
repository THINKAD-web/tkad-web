import type { DigitalMixResult } from "@/lib/integrated/schemas";

export type ResolvedDigitalMixSource = "local" | "unavailable";

export type MixFetchSide = {
  ok: boolean;
  data: DigitalMixResult | null;
  catalogSize: number;
  error?: string;
};

export type SelectedDigitalMix = {
  data: DigitalMixResult | null;
  catalogSize: number;
  source: ResolvedDigitalMixSource;
  localOk: boolean;
};

/** PR5-c commit 7 — local mix-engine only. */
export function selectDigitalMixSource(local: MixFetchSide): SelectedDigitalMix {
  const localOk =
    local.ok && local.data != null && local.data.channels.length > 0;
  if (localOk) {
    return {
      data: local.data,
      catalogSize: local.catalogSize,
      source: "local",
      localOk: true,
    };
  }
  return {
    data: null,
    catalogSize: 0,
    source: "unavailable",
    localOk: false,
  };
}
