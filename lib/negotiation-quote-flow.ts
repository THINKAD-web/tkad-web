import {
  OoHQuoteStatus,
  type PriceNegotiationRequest,
  type PrismaClient,
} from "@prisma/client";
import {
  calculateQuoteFromMediaIds,
  periodLabelForDays,
  QUOTE_VALIDITY_DAYS,
} from "@/lib/quote-calculator";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { sendOoHQuoteToClient } from "@/lib/ooh-quote-send";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { createNotification } from "@/lib/notifications";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackBookingConfirm } from "@/lib/quote-slack-notify";
import { createHoldsForQuote } from "@/lib/ooh-quote-booking-hold";
import { siteUrl } from "@/lib/seo";
import {
  adminOohQuoteUrl,
  sendTelegramMessage,
} from "@/lib/telegram-notify";

const NEGOTIATION_CAMPAIGN_DAYS = 30;
const LEAD_DAYS = 14;

function siteBaseUrl(): string {
  return siteUrl.replace(/\/$/, "");
}

function defaultCampaignDates(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + LEAD_DAYS);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + NEGOTIATION_CAMPAIGN_DAYS - 1);
  return { start, end };
}

export async function createOoHQuoteFromNegotiation(
  db: PrismaClient,
  row: PriceNegotiationRequest & {
    media: {
      id: string;
      name: string;
      location: string;
      price: number;
      pricePeriod: string | null;
      dailyFootfall: number | null;
      impressions: number | null;
      latitude: number | null;
      longitude: number | null;
    };
  },
  locale: "ko" | "en" = "ko",
): Promise<{ quoteId: string }> {
  const existing = await db.ooHQuote.findFirst({
    where: { priceNegotiationId: row.id },
    select: { id: true },
  });
  if (existing) return { quoteId: existing.id };

  const { start, end } = defaultCampaignDates();
  const base = await calculateQuoteFromMediaIds(db, {
    mediaIds: [row.media.id],
    startDate: start,
    endDate: end,
    discountRate: 0,
  });

  const listSupply = base.lines[0]?.lineSupplyWon ?? catalogPriceFieldToWon(row.media.price);
  const negotiatedSupply = row.proposedPriceWon;
  const discountWon = Math.max(0, listSupply - negotiatedSupply);
  const discountRate =
    listSupply > 0 ? Math.min(100, (discountWon / listSupply) * 100) : 0;

  const lines = base.lines.map((line) => ({
    ...line,
    unitPriceWon: negotiatedSupply,
    lineSupplyWon: negotiatedSupply,
  }));

  const totals = computeAdminQuoteTotals({
    lineWons: [negotiatedSupply],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

  const clientName =
    row.companyName?.trim() ||
    row.contactEmail.split("@")[0]?.trim() ||
    "광고주";

  const quoteBreakdown = {
    lines,
    subtotalWon: listSupply,
    discountRate,
    discountWon,
    supplyWon: totals.supplyWon,
    vatWon: totals.vatWon,
    totalWon: totals.totalWon,
    validUntil: validUntil.toISOString(),
    issuedAt: new Date().toISOString(),
    negotiationNote:
      locale === "ko"
        ? "가격 제안 수락에 따른 협상 단가가 반영되었습니다."
        : "Negotiated rate applied from accepted price proposal.",
  };

  const ooh = await db.ooHQuote.create({
    data: {
      status: OoHQuoteStatus.draft,
      clientName,
      clientEmail: row.contactEmail.trim(),
      clientPhone: row.contactPhone.trim() || null,
      clientCompany: row.companyName?.trim() || null,
      mediaIds: [row.media.id],
      totalAmount: Math.max(1, Math.round(totals.totalWon / 10_000)),
      period: periodLabelForDays(base.periodDays, locale),
      periodKey: "30days",
      startDate: start,
      endDate: end,
      validUntil,
      discountRate,
      pdfTemplate: "premium",
      locale,
      priceNegotiationId: row.id,
      quoteBreakdown,
      adminNote:
        locale === "ko"
          ? `[가격 제안 수락] ${row.media.name} · 협상 단가 ${Math.round(row.proposedPriceWon / 10_000).toLocaleString("ko-KR")}만원/월`
          : `[Price proposal accepted] ${row.media.name}`,
    },
  });

  return { quoteId: ooh.id };
}

/** 견적 발송 → 부킹 요청 → 부킹 확정 → 계약서 준비 (협상 수락 전용 fast-track) */
export async function advanceNegotiationQuoteToContract(
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
      totalAmount: true,
      period: true,
      periodKey: true,
      mediaIds: true,
      startDate: true,
      endDate: true,
      priceNegotiationId: true,
    },
  });
  if (!row?.priceNegotiationId) {
    throw new Error("NOT_NEGOTIATION_QUOTE");
  }

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
      console.error("[negotiation-quote] send quote:", e);
    }
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await createHoldsForQuote(tx, row);
    await tx.ooHQuote.update({
      where: { id: quoteId },
      data: {
        status: OoHQuoteStatus.booking_confirmed,
        bookingRequestedAt: now,
        bookingConfirmedAt: now,
        quotePdfSentAt: now,
      },
    });
  });

  await ensureOohContractExists(db, quoteId, OoHQuoteStatus.booking_confirmed);

  void notifySlackBookingConfirm({
    quoteId,
    clientName: row.clientName,
    totalAmountManwon: row.totalAmount,
    period: row.period,
    mediaCount: row.mediaIds.length,
    source: "negotiation",
  }).catch((e) => console.error("[negotiation-quote] slack booking confirm", e));

  const base = siteBaseUrl();
  const contractAbs = `${base}${contractUrl}`;
  const previewAbs = `${base}${previewUrl}`;

  const isKo = localeStr === "ko";
  const to = row.clientEmail?.trim();
  if (to && isEmailConfigured()) {
    void sendEmail({
      to,
      subject: isKo
        ? "[THINKAD] 가격 제안 수락 — 전자계약을 진행해 주세요"
        : "[THINKAD] Price accepted — sign your e-contract",
      text: isKo
        ? [
            `안녕하세요 ${row.clientName}님,`,
            "",
            "제안하신 단가가 수락되었습니다. 견적서를 확인한 뒤 전자계약서에 서명해 주세요.",
            "",
            `견적 미리보기: ${previewAbs}`,
            `전자계약: ${contractAbs}`,
            "",
            "감사합니다.",
          ].join("\n")
        : [
            `Hello ${row.clientName},`,
            "",
            "Your proposed rate was accepted. Review the quote and sign the e-contract.",
            "",
            `Quote: ${previewAbs}`,
            `Contract: ${contractAbs}`,
          ].join("\n"),
      html: isKo
        ? `<p>제안 단가가 <strong>수락</strong>되었습니다.</p><p><a href="${previewAbs}">견적 미리보기</a> · <a href="${contractAbs}"><strong>전자계약 진행 →</strong></a></p>`
        : `<p>Your offer was <strong>accepted</strong>.</p><p><a href="${previewAbs}">View quote</a> · <a href="${contractAbs}"><strong>Sign contract →</strong></a></p>`,
    }).catch(() => {});
  }

  return { contractUrl, previewUrl };
}

export async function finalizeAcceptedNegotiation(
  db: PrismaClient,
  negotiationId: string,
): Promise<{ quoteId: string; contractUrl: string; previewUrl: string } | null> {
  const row = await db.priceNegotiationRequest.findUnique({
    where: { id: negotiationId },
    include: {
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
    },
  });
  if (!row || row.status !== "ACCEPTED") return null;

  const locale = "ko" as const;
  const { quoteId } = await createOoHQuoteFromNegotiation(db, row, locale);
  const urls = await advanceNegotiationQuoteToContract(db, quoteId);

  if (row.userId) {
    void createNotification({
      userId: row.userId,
      type: "QUOTE_ACCEPTED",
      title: "가격 제안이 수락되었어요",
      body: `${row.media.name} — 전자계약을 진행해 주세요.`,
      link: urls.contractUrl,
      dedupeKey: `negotiation_accept:${row.id}`,
    }).catch(() => {});
  }

  void postInternalAlert({
    type: "quote_request",
    title: "가격 제안 수락 → 견적·계약 자동 생성",
    body: `${row.media.name} · ₩${Math.round(row.proposedPriceWon / 10_000).toLocaleString("ko-KR")}만/월`,
    meta: { negotiationId: row.id, oohQuoteId: quoteId },
  }).catch(() => {});

  void sendTelegramMessage(
    `✅ 가격 제안 수락\n${row.media.name}\n₩${Math.round(row.proposedPriceWon / 10_000).toLocaleString("ko-KR")}만/월\n${adminOohQuoteUrl(quoteId)}`,
  ).catch(() => {});

  return { quoteId, ...urls };
}
