import {
  readDigitalOrigin,
  readDigitalOriginProtectionBypass,
} from "@/lib/integration/digital-origin";
import {
  INTEGRATION_CALLER_ID,
  readIntegrationServiceSecret,
} from "@/lib/integration/service-auth";
import {
  isDigitalMixCircuitOpen,
  recordDigitalMixFailure,
  recordDigitalMixSuccess,
} from "@/lib/integrated/digital-circuit-breaker";
import type {
  DigitalMixGenerateResponse,
  DigitalMixResult,
} from "@/lib/integrated/schemas";
import type { DigitalMixPayload } from "@/lib/integrated/field-adapters";

const FETCH_TIMEOUT_MS = 8_000;

export type FetchDigitalMixResult =
  | { ok: true; data: DigitalMixResult; catalogSize: number }
  | { ok: false; status: number | null; error: string; circuitOpen?: boolean };

function normalizeMixResult(raw: DigitalMixGenerateResponse["result"]): DigitalMixResult {
  return {
    input: {
      industry: raw.input.industry,
      goal: raw.input.goal,
      budgetMonthly: raw.input.budgetMonthly,
      periodWeeks: raw.input.periodWeeks,
    },
    generatedAt: raw.generatedAt,
    channels: raw.channels.map((c) => ({
      media: {
        slug: c.media.slug,
        nameKo: c.media.nameKo,
        nameEn: c.media.nameEn,
      },
      budgetWon: c.budgetWon,
      budgetPct: c.budgetPct,
      reason: c.reason,
    })),
    kpis: {
      impressionsMin: raw.kpis.impressionsMin,
      impressionsMax: raw.kpis.impressionsMax,
      clicksMin: raw.kpis.clicksMin,
      clicksMax: raw.kpis.clicksMax,
    },
  };
}

export async function fetchDigitalMixInternal(
  payload: DigitalMixPayload,
): Promise<FetchDigitalMixResult> {
  if (isDigitalMixCircuitOpen()) {
    return {
      ok: false,
      status: 503,
      error: "Circuit open",
      circuitOpen: true,
    };
  }

  const secret = readIntegrationServiceSecret();
  if (!secret) {
    return {
      ok: false,
      status: null,
      error: "INTEGRATION_SERVICE_SECRET not configured",
    };
  }

  const origin = readDigitalOrigin();
  const url = `${origin}/api/internal/mix/generate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const protectionBypass = readDigitalOriginProtectionBypass();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${secret}`,
      "X-Tkad-Caller": INTEGRATION_CALLER_ID,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (protectionBypass) {
      headers["x-vercel-protection-bypass"] = protectionBypass;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[fetchDigitalMixInternal] upstream error", {
        status: res.status,
        url,
        body: text.slice(0, 200),
      });
      recordDigitalMixFailure(res.status);
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as DigitalMixGenerateResponse;
    if (!data.result || !Array.isArray(data.result.channels)) {
      recordDigitalMixFailure(503);
      return { ok: false, status: 503, error: "Invalid mix response shape" };
    }

    recordDigitalMixSuccess();
    return {
      ok: true,
      data: normalizeMixResult(data.result),
      catalogSize: data.result.channels.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fetchDigitalMixInternal] fetch failed", { url, message });
    recordDigitalMixFailure(null);
    return { ok: false, status: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}
