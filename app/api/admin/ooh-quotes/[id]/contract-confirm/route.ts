import { NextRequest } from "next/server";
import {
  CampaignStatus,
  MediaBookingStatus,
  OoHQuoteStatus,
  OohContractStatus,
} from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  canAdminContractConfirm,
  estimateEndDate,
} from "@/lib/ooh-quote";
import { sendEmail } from "@/lib/email/client";
import { adminOohQuoteUrl } from "@/lib/telegram-notify";
import { notifyOohQuoteEvent } from "@/lib/slack-notify";

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

  // 가용 캘린더 자동 BLOCK — 각 매체에 대해 MediaBooking(confirmed) 생성.
  // 이미 같은 (mediaId, campaignId) 의 confirmed 가 있으면 skip — 멱등성 보장.
  // 일정 미확정 매체나 중복 매체ID 는 모두 안전하게 건너뜀.
  const startsAt = row.startDate ?? new Date();
  const endsAt =
    row.endDate ?? estimateEndDate(startsAt, row.periodKey ?? "1month");
  const uniqueMediaIds = Array.from(new Set(row.mediaIds.filter(Boolean)));

  if (uniqueMediaIds.length > 0) {
    const existing = await db.mediaBooking.findMany({
      where: {
        campaignId: campaign.id,
        mediaId: { in: uniqueMediaIds },
      },
      select: { mediaId: true },
    });
    const existingSet = new Set(existing.map((e) => e.mediaId));
    const toCreate = uniqueMediaIds
      .filter((mediaId) => !existingSet.has(mediaId))
      .map((mediaId) => ({
        mediaId,
        campaignId: campaign.id,
        title: campaign.name,
        startsAt,
        endsAt,
        status: MediaBookingStatus.confirmed,
        requesterName: row.clientName,
        requesterEmail: clientEmail,
        requesterPhone: row.clientPhone?.trim() || null,
        notes: `Auto-blocked on contract-confirm of OoHQuote ${row.id}`,
      }));
    if (toCreate.length > 0) {
      // createMany 는 silently skipDuplicates 옵션 사용
      await db.mediaBooking.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }
  }

  // Slack — 어드민 채널에 계약 확정 알림
  void notifyOohQuoteEvent({
    title: "OOH 계약 확정",
    bodyMd: `*${row.clientName}* (${row.clientCompany ?? "-"})\n₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period} · 매체 ${uniqueMediaIds.length}건\n캠페인: ${campaign.name}`,
    adminUrl: adminOohQuoteUrl(id),
  }).catch(() => {});

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
