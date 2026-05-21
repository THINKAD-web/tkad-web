import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { sendPotentialMediaOutreach } from "@/lib/media-owner-outreach";
import { buildOutreachFollowUpEmail } from "@/lib/email/potential-media-followup";

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/** 매체사 콜드 아웃리치 자동 시퀀스 */
export async function runPotentialMediaOutreachSequence(): Promise<{
  initial: number;
  followUp1: number;
  followUp2: number;
}> {
  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return { initial: 0, followUp1: 0, followUp2: 0 };
  }

  const db = getPrisma();
  const now = Date.now();
  let initial = 0;
  let followUp1 = 0;
  let followUp2 = 0;

  const newLeads = await db.potentialMedia.findMany({
    where: {
      outreachStatus: "NEW",
      outreachEmail: { not: null },
    },
    take: 20,
  });

  for (const lead of newLeads) {
    const email = lead.outreachEmail!.trim();
    const res = await sendPotentialMediaOutreach(lead.id, email);
    if (res.ok) initial += 1;
  }

  const emailed = await db.potentialMedia.findMany({
    where: {
      outreachStatus: { in: ["EMAILED", "OPENED"] },
      emailedAt: { not: null },
      registeredAt: null,
    },
    take: 40,
  });

  for (const lead of emailed) {
    if (!lead.emailedAt || !lead.outreachToken) continue;
    const email =
      lead.outreachEmail?.trim() ||
      (lead.contactInfo as { email?: string } | null)?.email?.trim();
    if (!email?.includes("@")) continue;

    const elapsed = now - lead.emailedAt.getTime();

    if (!lead.followUp1SentAt && elapsed >= MS_WEEK) {
      const mail = buildOutreachFollowUpEmail(1, lead, lead.outreachToken);
      try {
        await sendEmail({
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await db.potentialMedia.update({
          where: { id: lead.id },
          data: {
            followUp1SentAt: new Date(),
            outreachSequenceStep: 1,
          },
        });
        followUp1 += 1;
      } catch (e) {
        console.error("[outreach-f1]", lead.id, e);
      }
      continue;
    }

    if (
      lead.followUp1SentAt &&
      !lead.followUp2SentAt &&
      elapsed >= 2 * MS_WEEK
    ) {
      const mail = buildOutreachFollowUpEmail(2, lead, lead.outreachToken);
      try {
        await sendEmail({
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await db.potentialMedia.update({
          where: { id: lead.id },
          data: {
            followUp2SentAt: new Date(),
            outreachSequenceStep: 2,
          },
        });
        followUp2 += 1;
      } catch (e) {
        console.error("[outreach-f2]", lead.id, e);
      }
    }
  }

  return { initial, followUp1, followUp2 };
}
