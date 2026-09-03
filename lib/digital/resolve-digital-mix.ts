import { isDigitalForceLocal } from "@/lib/digital/force-local";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import { buildMediaMix } from "@/lib/digital/mix-engine";
import { digitalMixPayloadToMixInput } from "@/lib/digital/mix-input-adapter";
import {
  compareMixCompositionToBaseline,
  logMixGoldenCompare,
  type MixCompositionSnapshot,
} from "@/lib/digital/mix-golden-compare";
import { mixResultToDigitalMixResult } from "@/lib/digital/mix-result-adapter";
import { selectDigitalMixSource } from "@/lib/digital/select-digital-mix-source";
import { fetchDigitalMixInternal } from "@/lib/integrated/fetch-digital-mix";
import type { DigitalMixPayload } from "@/lib/integrated/field-adapters";
import type { DigitalMixResult } from "@/lib/integrated/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

export type ResolvedDigitalMix = ReturnType<typeof selectDigitalMixSource>;

async function buildLocalMixAsync(payload: DigitalMixPayload): Promise<
  | { ok: true; data: DigitalMixResult; catalogSize: number }
  | { ok: false; error: string }
> {
  const fetched = await fetchLocalDigitalCatalog();
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }
  return buildLocalMixFromCatalogViews(payload, fetched.views);
}

/** Test hook — build mix from in-memory catalog (no DB). */
export function buildLocalMixFromCatalogViews(
  payload: DigitalMixPayload,
  views: readonly PublicMediaView[],
):
  | { ok: true; data: DigitalMixResult; catalogSize: number }
  | { ok: false; error: string } {
  if (views.length === 0) {
    return { ok: false, error: "local online catalog empty" };
  }
  const input = digitalMixPayloadToMixInput(payload);
  const result = buildMediaMix([...views], input, {
    generatedAt: "2026-09-03T00:00:00.000Z",
  });
  if (result.channels.length === 0) {
    return { ok: false, error: "local mix produced zero channels" };
  }
  return {
    ok: true,
    data: mixResultToDigitalMixResult(result),
    catalogSize: views.length,
  };
}

/**
 * PR5-c commit 3 — local mix-engine first; dmpilot M2M fallback until commit 7.
 * `DIGITAL_FORCE_LOCAL=1`: local only, no dmpilot fetch.
 */
export async function resolveDigitalMix(
  payload: DigitalMixPayload,
): Promise<ResolvedDigitalMix> {
  const forceLocal = isDigitalForceLocal();
  const localBuilt = await buildLocalMixAsync(payload);
  const local = {
    ok: localBuilt.ok,
    data: localBuilt.ok ? localBuilt.data : null,
    catalogSize: localBuilt.ok ? localBuilt.catalogSize : 0,
    error: localBuilt.ok ? undefined : localBuilt.error,
  };

  if (forceLocal) {
    const selected = selectDigitalMixSource({
      forceLocal: true,
      local,
      remote: { ok: false, data: null, catalogSize: 0 },
    });
    if (!selected.localOk) {
      console.warn("[resolveDigitalMix] forceLocal but local mix unavailable", {
        error: local.error,
      });
    }
    return selected;
  }

  const remoteFetched = await fetchDigitalMixInternal(payload);
  const remote = {
    ok: remoteFetched.ok,
    data: remoteFetched.ok ? remoteFetched.data : null,
    catalogSize: remoteFetched.ok ? remoteFetched.catalogSize : 0,
    error: remoteFetched.ok ? undefined : remoteFetched.error,
  };

  if (local.ok && remote.ok && local.data && remote.data) {
    const localSnap: MixCompositionSnapshot = {
      channelCount: local.data.channels.length,
      slugs: local.data.channels.map((c) => c.media.slug).sort(),
      budgetTotal: local.data.channels.reduce((s, c) => s + c.budgetWon, 0),
    };
    const remoteSnap: MixCompositionSnapshot = {
      channelCount: remote.data.channels.length,
      slugs: remote.data.channels.map((c) => c.media.slug).sort(),
      budgetTotal: remote.data.channels.reduce((s, c) => s + c.budgetWon, 0),
    };
    const compare = compareMixCompositionToBaseline(localSnap, remoteSnap);
    logMixGoldenCompare("local-vs-dmpilot-live", compare);
  } else if (local.ok && !remote.ok) {
    console.warn("[resolveDigitalMix] dmpilot unavailable; using local mix", {
      error: remote.error,
    });
  } else if (!local.ok && remote.ok) {
    console.warn("[resolveDigitalMix] local mix unavailable; dmpilot fallback", {
      error: local.error,
    });
  } else {
    console.error("[resolveDigitalMix] local and dmpilot mix unavailable", {
      localError: local.error,
      remoteError: remote.error,
    });
  }

  return selectDigitalMixSource({ forceLocal: false, local, remote });
}
