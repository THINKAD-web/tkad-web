import { OoHQuoteStatus, type PrismaClient } from "@prisma/client";
import {
  calculateQuoteFromMediaIds,
  periodLabelForDays,
  QUOTE_VALIDITY_DAYS,
} from "@/lib/quote-calculator";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import { sendOoHQuoteToClient } from "@/lib/ooh-quote-send";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { createNotification } from "@/lib/notifications";
import { postInternalAlert } from "@/lib/internal-webhook";
import { siteUrl } from "@/lib/seo";
import {
  CHAT_LABEL_OWNER,
  CHAT_LABEL_SYSTEM,
} from "@/lib/chat-constants";
import { ChatSenderRole } from "@prisma/client";

const CHAT_CAMPAIGN_DAYS = 30;
const LEAD_DAYS = 14;

function siteBaseUrl(): string {
  return siteUrl.replace(/\/$/, "");
}

function defaultCampaignDates(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + LEAD_DAYS);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + CHAT_CAMPAIGN_DAYS - 1);
  return { start, end };
}

export async function createOoHQuoteFromChatRoom(
  db: PrismaClient,
  roomId: string,
): Promise<{ quoteId: string }> {
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      advertiser: { select: { id: true, email: true, name: true, company: true } },
      media: {
        select: {
          id: true,
          name: true,
          location: true,
          price: true,
          pricePeriod: true,
          dailyFootfall: true,
          impressions: true,
          latitude: true,
          longitude: true,
        },
      },
      oohQuote: { select: { id: true } },
    },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  if (room.oohQuote) return { quoteId: room.oohQuote.id };

  const locale = room.locale === "en" ? "en" : "ko";
  const { start, end } = defaultCampaignDates();
  const base = await calculateQuoteFromMediaIds(db, {
    mediaIds: [room.media.id],
    startDate: start,
    endDate: end,
    discountRate: 0,
  });

  const supply = base.lines[0]?.lineSupplyWon ?? 0;
  const totals = computeAdminQuoteTotals({
    lineWons: [supply],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

  const clientName =
    room.advertiser.company?.trim() ||
    room.advertiser.name?.trim() ||
    room.advertiser.email.split("@")[0]?.trim() ||
    "광고주";

  const quoteBreakdown = {
    lines: base.lines,
    subtotalWon: supply,
    discountRate: 0,
    discountWon: 0,
    supplyWon: totals.supplyWon,
    vatWon: totals.vatWon,
    totalWon: totals.totalWon,
    validUntil: validUntil.toISOString(),
    issuedAt: new Date().toISOString(),
    chatNote:
      locale === "ko"
        ? "채팅 상담을 바탕으로 한 견적 초안입니다."
        : "Quote draft from anonymous chat.",
  };

  const ooh = await db.ooHQuote.create({
    data: {
      status: OoHQuoteStatus.draft,
      clientName,
      clientEmail: room.advertiser.email.trim(),
      clientCompany: room.advertiser.company?.trim() || null,
      mediaIds: [room.media.id],
      totalAmount: Math.max(1, Math.round(totals.totalWon / 10_000)),
      period: periodLabelForDays(base.periodDays, locale),
      periodKey: "30days",
      startDate: start,
      endDate: end,
      validUntil,
      discountRate: 0,
      pdfTemplate: "premium",
      locale,
      quoteBreakdown,
      adminNote:
        locale === "ko"
          ? `[채팅 견적] ${room.media.name}`
          : `[Chat quote] ${room.media.name}`,
    },
  });

  await db.chatRoom.update({
    where: { id: roomId },
    data: { oohQuoteId: ooh.id },
  });

  const previewPath = `/quote/${ooh.id}/preview`;
  const isKo = locale === "ko";

  await db.chatMessage.create({
    data: {
      roomId,
      senderRole: ChatSenderRole.owner,
      senderUserId: room.ownerUserId,
      displayLabel: CHAT_LABEL_OWNER,
      body: isKo
        ? `견적서 초안이 준비되었습니다. 미리보기에서 확인해 주세요.`
        : `A quote draft is ready. Please review the preview.`,
      bodySanitized: isKo
        ? `견적서 초안: ${previewPath}`
        : `Quote draft: ${previewPath}`,
      quoteId: ooh.id,
    },
  });

  void createNotification({
    userId: room.advertiserUserId,
    type: "QUOTE_RECEIVED",
    title: isKo ? "견적서 초안 도착" : "Quote draft ready",
    body: room.media.name,
    link: previewPath,
    dedupeKey: `chat_quote:${ooh.id}`,
  }).catch(() => {});

  return { quoteId: ooh.id };
}

export async function advanceChatQuoteToContract(
  db: PrismaClient,
  quoteId: string,
): Promise<{ contractUrl: string; previewUrl: string }> {
  const row = await db.ooHQuote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      locale: true,
      clientName: true,
      clientEmail: true,
      status: true,
      chatRoom: { select: { id: true } },
    },
  });
  if (!row?.chatRoom) throw new Error("NOT_CHAT_QUOTE");

  const localeStr = row.locale === "en" ? "en" : "ko";
  const previewUrl = `/${localeStr}/quote/${quoteId}/preview`;
  const contractUrl = `/${localeStr}/quote/${quoteId}/contract`;

  if (row.status === OoHQuoteStatus.booking_confirmed) {
    await ensureOohContractExists(db, quoteId, OoHQuoteStatus.booking_confirmed);
    return { contractUrl, previewUrl };
  }

  if (
    row.status === OoHQuoteStatus.draft ||
    row.status === OoHQuoteStatus.sent
  ) {
    try {
      await sendOoHQuoteToClient(db, quoteId);
    } catch (e) {
      console.error("[chat-quote] send quote:", e);
    }
  }

  const now = new Date();
  await db.ooHQuote.update({
    where: { id: quoteId },
    data: {
      status: OoHQuoteStatus.booking_confirmed,
      bookingRequestedAt: now,
      bookingConfirmedAt: now,
      quotePdfSentAt: now,
    },
  });

  await ensureOohContractExists(db, quoteId, OoHQuoteStatus.booking_confirmed);

  const base = siteBaseUrl();
  const contractAbs = `${base}${contractUrl}`;
  const previewAbs = `${base}${previewUrl}`;
  const isKo = localeStr === "ko";
  const to = row.clientEmail?.trim();

  if (to && isEmailConfigured()) {
    void sendEmail({
      to,
      subject: isKo
        ? "[THINKAD] 견적 수락 — 전자계약을 진행해 주세요"
        : "[THINKAD] Quote accepted — sign your e-contract",
      text: isKo
        ? [
            `안녕하세요 ${row.clientName}님,`,
            "",
            "채팅 견적이 수락되었습니다. 전자계약서에 서명해 주세요.",
            "",
            `견적: ${previewAbs}`,
            `계약: ${contractAbs}`,
          ].join("\n")
        : [
            `Hello ${row.clientName},`,
            "",
            "Your chat quote was accepted. Please sign the e-contract.",
            "",
            `Quote: ${previewAbs}`,
            `Contract: ${contractAbs}`,
          ].join("\n"),
      html: isKo
        ? `<p>견적이 <strong>수락</strong>되었습니다.</p><p><a href="${previewAbs}">견적</a> · <a href="${contractAbs}"><strong>전자계약 →</strong></a></p>`
        : `<p>Quote <strong>accepted</strong>.</p><p><a href="${previewAbs}">Preview</a> · <a href="${contractAbs}"><strong>Contract →</strong></a></p>`,
    }).catch(() => {});
  }

  return { contractUrl, previewUrl };
}

export async function acceptChatRoomQuote(
  db: PrismaClient,
  roomId: string,
  advertiserUserId: string,
): Promise<{ quoteId: string; contractUrl: string; previewUrl: string } | null> {
  const room = await db.chatRoom.findFirst({
    where: { id: roomId, advertiserUserId },
    include: { oohQuote: true, media: { select: { name: true } } },
  });
  if (!room?.oohQuoteId || !room.oohQuote) return null;

  const urls = await advanceChatQuoteToContract(db, room.oohQuoteId);
  const locale = room.locale === "en" ? "en" : "ko";
  const isKo = locale === "ko";

  await db.chatMessage.create({
    data: {
      roomId,
      senderRole: ChatSenderRole.system,
      displayLabel: CHAT_LABEL_SYSTEM,
      body: isKo
        ? "광고주가 견적을 수락했습니다. 전자계약 단계로 진행됩니다."
        : "Advertiser accepted the quote. Proceeding to e-contract.",
      bodySanitized: urls.contractUrl,
    },
  });

  void createNotification({
    userId: room.ownerUserId,
    type: "QUOTE_ACCEPTED",
    title: isKo ? "채팅 견적 수락" : "Chat quote accepted",
    body: room.media.name,
    link: urls.contractUrl,
    dedupeKey: `chat_accept:${room.oohQuoteId}`,
  }).catch(() => {});

  void postInternalAlert({
    type: "quote_request",
    title: "채팅 견적 수락 → 계약",
    body: room.media.name,
    meta: { roomId, oohQuoteId: room.oohQuoteId },
  }).catch(() => {});

  return { quoteId: room.oohQuoteId, ...urls };
}
