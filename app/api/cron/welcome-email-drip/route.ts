import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runAdvertiserWelcomeDrip } from "@/lib/welcome-email-runner";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  const result = await runAdvertiserWelcomeDrip();
  return json({ ok: true, ...result });
}
