import { randomBytes } from "crypto";
import type { PotentialMedia } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  buildPotentialMediaOutreachEmail,
  outreachRegisterUrl,
  outreachTrackPixelUrl,
} from "@/lib/email/media-owner-outreach";

export async function sendPotentialMediaOutreach(
  leadId: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "database_unavailable" };
  }
  if (!isEmailConfigured()) {
    return { ok: false, error: "email_unavailable" };
  }

  const db = getPrisma();
  const lead = await db.potentialMedia.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "not_found" };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return { ok: false, error: "invalid_email" };

  const token =
    lead.outreachToken ?? `ot_${randomBytes(16).toString("hex")}`;
  const registerUrl = outreachRegisterUrl(token);
  const trackPixelUrl = outreachTrackPixelUrl(token);

  const contact = lead.contactInfo as { phone?: string } | null;
  const companyOrName =
    lead.name.split(/[\s,(]/)[0]?.slice(0, 24) || "파트너";

  const mail = buildPotentialMediaOutreachEmail({
    lead,
    companyOrName,
    registerUrl,
    trackPixelUrl,
  });

  try {
    await sendEmail({
      to: trimmed,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (e) {
    console.error("[outreach] send", e);
    return { ok: false, error: "send_failed" };
  }

  await db.potentialMedia.update({
    where: { id: leadId },
    data: {
      outreachToken: token,
      outreachEmail: trimmed,
      emailedAt: new Date(),
      outreachStatus: "EMAILED",
      contactInfo: {
        ...(typeof contact === "object" && contact ? contact : {}),
        email: trimmed,
      },
    },
  });

  return { ok: true };
}

export async function recordOutreachEmailOpen(
  token: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  const lead = await db.potentialMedia.findFirst({
    where: { outreachToken: token },
    select: { id: true, emailOpenedAt: true, outreachStatus: true },
  });
  if (!lead) return;

  await db.potentialMedia.update({
    where: { id: lead.id },
    data: {
      emailOpenedAt: lead.emailOpenedAt ?? new Date(),
      outreachStatus:
        lead.outreachStatus === "EMAILED" ? "OPENED" : lead.outreachStatus,
    },
  });
}
