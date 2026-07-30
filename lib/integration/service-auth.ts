import { timingSafeEqual } from "crypto";

/** Outbound M2M secret — must match Digital `INTEGRATION_SERVICE_SECRET`. */
export function readIntegrationServiceSecret(): string | null {
  const s = process.env.INTEGRATION_SERVICE_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-integration-service-secret";
  }
  return null;
}

export function integrationSecretsEqual(
  provided: string | null | undefined,
  expected: string | null,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const INTEGRATION_CALLER_ID = "tkad-web-bff";
