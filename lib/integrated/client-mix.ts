import type {
  IntegratedMixRequest,
  IntegratedMixResponse,
} from "@/lib/integrated/schemas";

export type IntegratedMixErrorCode =
  | "NEED_LOGIN"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "INSUFFICIENT_CATALOG"
  | "VALIDATION_FAILED"
  | "NETWORK"
  | "UNKNOWN";

export type IntegratedMixFetchResult =
  | { ok: true; data: IntegratedMixResponse }
  | {
      ok: false;
      status: number;
      error: IntegratedMixErrorCode;
      message: string;
      needLogin?: boolean;
    };

function parseErrorCode(raw: unknown): IntegratedMixErrorCode {
  if (typeof raw !== "string") return "UNKNOWN";
  switch (raw) {
    case "NEED_LOGIN":
    case "RATE_LIMITED":
    case "UPSTREAM_UNAVAILABLE":
    case "INSUFFICIENT_CATALOG":
    case "VALIDATION_FAILED":
      return raw;
    default:
      return "UNKNOWN";
  }
}

export async function fetchIntegratedMix(
  request: IntegratedMixRequest,
  signal?: AbortSignal,
): Promise<IntegratedMixFetchResult> {
  try {
    const res = await fetch("/api/integrated/mix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
      credentials: "same-origin",
    });

    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    if (!res.ok) {
      const error = parseErrorCode(body.error);
      const message =
        typeof body.message === "string"
          ? body.message
          : res.status === 429
            ? "Too many requests. Please try again shortly."
            : "Integrated mix request failed.";
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 401
            ? "NEED_LOGIN"
            : res.status === 429
              ? "RATE_LIMITED"
              : res.status === 503
                ? "UPSTREAM_UNAVAILABLE"
                : error,
        message,
        needLogin: body.needLogin === true || res.status === 401,
      };
    }

    return { ok: true, data: body as unknown as IntegratedMixResponse };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    return {
      ok: false,
      status: 0,
      error: "NETWORK",
      message: "Network error while fetching integrated mix.",
    };
  }
}
