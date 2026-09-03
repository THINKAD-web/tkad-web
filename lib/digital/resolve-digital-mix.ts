import "@/lib/digital/server-only";
import { isDigitalForceLocal } from "@/lib/digital/force-local";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import { buildMediaMix } from "@/lib/digital/mix-engine";
import { digitalMixPayloadToMixInput } from "@/lib/digital/mix-input-adapter";
import { mixResultToDigitalMixResult } from "@/lib/digital/mix-result-adapter";
import { selectDigitalMixSource } from "@/lib/digital/select-digital-mix-source";
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
 * PR5-c commit 7 — local mix-engine only (dmpilot M2M removed).
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

  const selected = selectDigitalMixSource({
    forceLocal: true,
    local,
    remote: { ok: false, data: null, catalogSize: 0 },
  });

  if (!selected.localOk) {
    console.warn("[resolveDigitalMix] local mix unavailable", {
      error: local.error,
      forceLocal,
    });
  }

  return selected;
}
