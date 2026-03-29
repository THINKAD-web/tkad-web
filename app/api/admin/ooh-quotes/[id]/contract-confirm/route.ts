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

  await db.ooHQuote.update({
    where: { id },
    data: {
      status: OoHQuoteStatus.contract_confirmed,
      contractConfirmedAt: new Date(),
      campaignId: campaign.id,
    },
  });

  await db.oohContract.updateMany({
    where: {
      ooHQuoteId: id,
      status: {
        in: [OohContractStatus.signed, OohContractStatus.confirmed],
      },
    },
    data: { status: OohContractStatus.confirmed },
  });

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

  return json({
    ok: true,
    status: OoHQuoteStatus.contract_confirmed,
    campaignId: campaign.id,
  });
}
