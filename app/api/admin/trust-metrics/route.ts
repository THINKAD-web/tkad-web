import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  getTrustMetrics,
  getTrustOverrideRaw,
  setTrustOverride,
} from "@/lib/trust-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  try {
    const [current, override] = await Promise.all([
      getTrustMetrics(),
      getTrustOverrideRaw(),
    ]);
    return json({ current, override });
  } catch (e) {
    console.error("[admin trust-metrics GET]", e instanceof Error ? e.message : e);
    return json({ current: null, override: {} });
  }
}

export async function POST(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const num = (v: unknown) =>
    v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  try {
    await setTrustOverride({
      mediaCount: num(body.mediaCount),
      brandCount: num(body.brandCount),
      campaignCount: num(body.campaignCount),
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[admin trust-metrics POST]", e instanceof Error ? e.message : e);
    return json(
      { ok: false, error: "저장 실패 — site_settings 마이그레이션이 필요할 수 있습니다." },
      500,
    );
  }
}
