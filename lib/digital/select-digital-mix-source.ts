import type { DigitalMixResult } from "@/lib/integrated/schemas";

export type ResolvedDigitalMixSource = "local" | "dmpilot" | "unavailable";

export type MixFetchSide = {
  ok: boolean;
  data: DigitalMixResult | null;
  catalogSize: number;
  error?: string;
};

export type SelectDigitalMixInput = {
  forceLocal: boolean;
  local: MixFetchSide;
  remote: MixFetchSide;
};

export type SelectedDigitalMix = {
  data: DigitalMixResult | null;
  catalogSize: number;
  source: ResolvedDigitalMixSource;
  localOk: boolean;
  remoteOk: boolean;
  forceLocal: boolean;
  usedDmpilotFallback: boolean;
};

/** PR5-c commit 3 — local mix first; dmpilot M2M fallback until commit 7. */
export function selectDigitalMixSource(
  input: SelectDigitalMixInput,
): SelectedDigitalMix {
  const { forceLocal, local, remote } = input;
  const localOk = local.ok && local.data != null && local.data.channels.length > 0;
  const remoteOk =
    remote.ok && remote.data != null && remote.data.channels.length > 0;

  if (forceLocal) {
    if (localOk) {
      return {
        data: local.data,
        catalogSize: local.catalogSize,
        source: "local",
        localOk: true,
        remoteOk: false,
        forceLocal: true,
        usedDmpilotFallback: false,
      };
    }
    return {
      data: null,
      catalogSize: 0,
      source: "unavailable",
      localOk: false,
      remoteOk: false,
      forceLocal: true,
      usedDmpilotFallback: false,
    };
  }

  if (localOk) {
    return {
      data: local.data,
      catalogSize: local.catalogSize,
      source: "local",
      localOk: true,
      remoteOk,
      forceLocal: false,
      usedDmpilotFallback: false,
    };
  }

  if (remoteOk) {
    return {
      data: remote.data,
      catalogSize: remote.catalogSize,
      source: "dmpilot",
      localOk: false,
      remoteOk: true,
      forceLocal: false,
      usedDmpilotFallback: true,
    };
  }

  return {
    data: null,
    catalogSize: 0,
    source: "unavailable",
    localOk: false,
    remoteOk: false,
    forceLocal: false,
    usedDmpilotFallback: false,
  };
}
