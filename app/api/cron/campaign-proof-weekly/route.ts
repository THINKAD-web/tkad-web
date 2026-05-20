import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { buildWeeklyProofDigestEmails } from "@/lib/email/campaign-proof-weekly";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return json({ ok: false, reason: "not_configured" }, 200);
  }

  const digests = await buildWeeklyProofDigestEmails();
  const db = getPrisma();
  let sent = 0;

  for (const d of digests) {
    try {
      await sendEmail({
        to: d.to,
        subject: d.subject,
        text: d.text,
        html: d.html,
      });
      await db.campaignProofWeeklyDigest.create({
        data: {
          campaignId: d.campaignId,
          periodKey: d.periodKey,
          recipient: d.to,
        },
      });
      sent += 1;
    } catch (e) {
      console.error("[cron.campaign-proof-weekly]", d.campaignId, e);
    }
  }

  return json({ ok: true, queued: digests.length, sent });
}
