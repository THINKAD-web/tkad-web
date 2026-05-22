import { NextRequest, NextResponse } from "next/server";
import { runPointsExpiryCron } from "@/lib/points-expiry-cron";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runPointsExpiryCron();
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/points-expiry]", e);
    return json({ error: "Cron failed" }, { status: 500 });
  }
}
