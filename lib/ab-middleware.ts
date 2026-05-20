import { type NextRequest, NextResponse } from "next/server";
import {
  AB_COOKIE_MAX_AGE_SEC,
  AB_COOKIE_NAME,
  isAbBotUserAgent,
  isAbVariant,
  parseAbQueryVariant,
  pickRandomVariant,
  type AbVariant,
} from "@/lib/ab-testing";

type VariantPolicy = { forcedVariant: AbVariant | null };

let policyCache: { value: VariantPolicy; at: number } | null = null;
const POLICY_CACHE_MS = 30_000;

export function invalidateAbPolicyCache() {
  policyCache = null;
}

async function fetchVariantPolicy(
  request: NextRequest,
): Promise<VariantPolicy> {
  const now = Date.now();
  if (policyCache && now - policyCache.at < POLICY_CACHE_MS) {
    return policyCache.value;
  }
  try {
    const url = new URL("/api/ab/variant-policy", request.url);
    const res = await fetch(url.toString(), {
      headers: { "x-ab-middleware": "1" },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return { forcedVariant: null };
    }
    const data = (await res.json()) as { forcedVariant?: string | null };
    const forcedRaw = data.forcedVariant ?? null;
    const forced = isAbVariant(forcedRaw) ? forcedRaw : null;
    const value = { forcedVariant: forced };
    policyCache = { value, at: now };
    return value;
  } catch {
    return { forcedVariant: null };
  }
}

function resolveVariantForRequest(
  request: NextRequest,
  forced: AbVariant | null,
): AbVariant {
  if (forced) return forced;

  const queryVariant = parseAbQueryVariant(
    request.nextUrl.searchParams.get("v"),
  );
  if (queryVariant) return queryVariant;

  const cookieVariant = request.cookies.get(AB_COOKIE_NAME)?.value;
  if (isAbVariant(cookieVariant)) return cookieVariant;

  if (isAbBotUserAgent(request.headers.get("user-agent"))) return "a";

  return pickRandomVariant();
}

function applyAbCookie(response: NextResponse, variant: AbVariant): NextResponse {
  response.cookies.set(AB_COOKIE_NAME, variant, {
    path: "/",
    maxAge: AB_COOKIE_MAX_AGE_SEC,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("x-ab-variant", variant);
  return response;
}

/**
 * next-intl 응답에 A/B variant 쿠키·헤더 부여
 */
export async function withAbVariantCookie(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const policy = await fetchVariantPolicy(request);
  const variant = resolveVariantForRequest(request, policy.forcedVariant);
  return applyAbCookie(response, variant);
}
