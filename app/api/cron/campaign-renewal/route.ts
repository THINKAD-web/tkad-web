import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runCampaignRenewalProposals } from "@/lib/campaign-renewal-proposal";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "db_not_configured" }, 200);
  }
  const result = await runCampaignRenewalProposals(getPrisma());
  return json({ ok: true, ...result });
}
