import { NextRequest } from "next/server";
import {
  CampaignStatus,
  OoHQuoteStatus,
  OohContractStatus,
} from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminContractConfirm } from "@/lib/ooh-quote";
import { sendEmail } from "@/lib/email/client";
import { notifyCampaignConfirmed } from "@/lib/kakao-alimtalk-notify";
import {
  ensureConfirmedHoldsForQuote,
  isBookingHoldConflictError,
  isQuoteHoldDatesRequiredError,
} from "@/lib/ooh-quote-booking-hold";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminContractConfirm(row.status)) {
    return json({ error: "Invalid status for this action" }, 409);
  }

  const clientEmail = row.clientEmail?.trim();
  if (!clientEmail) {
    return json({ error: "Customer email required for campaign" }, 400);
  }

  const name =
    (row.clientCompany?.trim() || row.clientName) + " OOH";

  const campaign = await db.campaign.create({
    data: {
      name: name.slice(0, 200),
      clientCompany: row.clientCompany?.trim() || row.clientName,
      clientName: row.clientName,
      clientEmail,
      clientPhone: row.clientPhone?.trim() || null,
      status: CampaignStatus.contract,
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      startDate: row.startDate,
      endDate: row.endDate,
      notes: `From OoHQuote ${row.id}`,
    },
  });

  try {
    await db.$transaction(async (tx) => {
      // SSOT: 홀드가 없으면 생성 후 confirmed 승격 (booking_confirm 누락 보완)
      await ensureConfirmedHoldsForQuote(tx, row);
      await tx.ooHQuote.update({
        where: { id },
        data: {
          status: OoHQuoteStatus.contract_confirmed,
          contractConfirmedAt: new Date(),
          campaignId: campaign.id,
        },
      });
      await tx.oohContract.updateMany({
        where: {
          ooHQuoteId: id,
          status: {
            in: [OohContractStatus.signed, OohContractStatus.confirmed],
          },
        },
        data: { status: OohContractStatus.confirmed },
      });
    });
  } catch (e) {
    if (isQuoteHoldDatesRequiredError(e)) {
      return json(
        {
          error: "계약 확정에 시작일(또는 기간)이 필요합니다.",
          code: e.code,
        },
        409,
      );
    }
    if (isBookingHoldConflictError(e)) {
      return json(
        {
          error: e.message,
          code: e.code,
          conflicts: e.conflicts,
        },
        409,
      );
    }
    throw e;
  }

  const isKo = row.locale !== "en";
  try {
    await sendEmail({
      to: clientEmail,
      subject: isKo
        ? "[싱커드] 계약이 확정되었습니다"
        : "[THINKAD] Contract confirmed",
      text: isKo
        ? `안녕하세요 ${row.clientName}님,\n\n계약이 확정되었습니다.\n캠페인명: ${campaign.name}\n송출 일정은 담당자가 순차 안내드립니다.\n\n감사합니다.`
        : `Hello ${row.clientName},\n\nYour contract is confirmed.\nCampaign: ${campaign.name}\nOur team will follow up with the schedule.\n\nThank you.`,
      html: isKo
        ? `<p>안녕하세요 <strong>${row.clientName}</strong>님,</p><p>계약이 확정되었습니다.</p><p>캠페인명: ${campaign.name}</p><p>송출 일정은 담당자가 순차 안내드립니다.</p>`
        : `<p>Hello <strong>${row.clientName}</strong>,</p><p>Your contract is confirmed.</p><p>Campaign: ${campaign.name}</p>`,
    });
  } catch (e) {
    console.error("[contract-confirm email]", e);
  }

  const confirmPhone = row.clientPhone?.trim();
  if (confirmPhone) {
    void notifyCampaignConfirmed({
      phone: confirmPhone,
      name: row.clientName,
      campaignName: campaign.name,
    }).catch((err) => console.error("[contract-confirm] alimtalk:", err));
  }

  return json({
    ok: true,
    status: OoHQuoteStatus.contract_confirmed,
    campaignId: campaign.id,
  });
}
