import { readDigitalOrigin } from "@/lib/integration/digital-origin";
import {
  INTEGRATION_CALLER_ID,
  readIntegrationServiceSecret,
} from "@/lib/integration/service-auth";
import type { DigitalCatalogResponse } from "@/lib/planner/digital-catalog-types";

const FETCH_TIMEOUT_MS = 4_000;

export type FetchDigitalCatalogResult =
  | { ok: true; data: DigitalCatalogResponse }
  | { ok: false; status: number | null; error: string };

export async function fetchDigitalCatalogInternal(): Promise<FetchDigitalCatalogResult> {
  const secret = readIntegrationServiceSecret();
  if (!secret) {
    return {
      ok: false,
      status: null,
      error: "INTEGRATION_SERVICE_SECRET not configured",
    };
  }

  const origin = readDigitalOrigin();
  const url = `${origin}/api/internal/catalog`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "X-Tkad-Caller": INTEGRATION_CALLER_ID,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[fetchDigitalCatalogInternal] upstream error", {
        status: res.status,
        url,
        body: text.slice(0, 200),
      });
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as DigitalCatalogResponse;
    if (!Array.isArray(data.items)) {
      return { ok: false, status: res.status, error: "Invalid catalog response shape" };
    }

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fetchDigitalCatalogInternal] fetch failed", { url, message });
    return { ok: false, status: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}
