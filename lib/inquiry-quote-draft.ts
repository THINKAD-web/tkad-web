import { OoHQuoteStatus, type PrismaClient } from "@prisma/client";
import {
  buildParsedInquiryQuoteIntent,
  regionWhereClause,
  type ParsedInquiryQuoteIntent,
} from "@/lib/inquiry-quote-parse";
import {
  budgetRangeManwonFromCode,
  calculateQuoteFromMediaIds,
  periodLabelForDays,
} from "@/lib/quote-calculator";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackInquiryQuoteDraft } from "@/lib/quote-slack-notify";
import { sendTelegramMessage } from "@/lib/telegram-notify";
import type { ContactBudgetV2, ContactRegion } from "@/lib/contact-lead-schema";
import { adminOohQuoteUrl } from "@/lib/telegram-notify";

export type CreateInquiryQuoteDraftInput = {
  inquiryId: string;
  company: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  budgetLabel?: string;
  locale?: string;
  explicitMediaIds?: string[];
  startDateRaw?: string;
  regions?: ContactRegion[];
  budgetCode?: ContactBudgetV2;
  durationMonths?: number;
};

async function resolveMediaForIntent(
  db: PrismaClient,
  intent: ParsedInquiryQuoteIntent,
): Promise<
  Array<{
    id: string;
    name: string;
    location: string;
    price: number;
    pricePeriod: string | null;
    dailyFootfall: number | null;
    impressions: number | null;
    latitude: number | null;
    longitude: number | null;
  }>
> {
  if (intent.mediaIds.length > 0) {
    const rows = await db.media.findMany({
      where: publicActiveMediaWhere({
        id: { in: intent.mediaIds.slice(0, 12) },
      }),
    });
    const order = new Map(intent.mediaIds.map((id, i) => [id, i]));
    return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  const regionFilter = regionWhereClause(intent.regions);
  const rows = await db.media.findMany({
    where: publicActiveMediaWhere({
      availability: "available",
      ...(regionFilter ?? {}),
    }),
    orderBy: [{ popularityScore: "desc" }, { visibilityScore: "desc" }],
    take: 3,
  });
  return rows;
}

export async function createInquiryQuoteDraft(
  db: PrismaClient,
  input: CreateInquiryQuoteDraftInput,
): Promise<{ quoteId: string } | null> {
  const existing = await db.ooHQuote.findFirst({
    where: { contactInquiryId: input.inquiryId },
    select: { id: true },
  });
  if (existing) return { quoteId: existing.id };

  const locale = input.locale === "en" ? "en" : "ko";
  const intent = buildParsedInquiryQuoteIntent({
    message: input.message,
    budgetLabel: input.budgetLabel,
    explicitMediaIds: input.explicitMediaIds,
    startDateRaw: input.startDateRaw,
    regions: input.regions,
    budgetCode: input.budgetCode,
  });

  const mediaRows = await resolveMediaForIntent(db, intent);
  if (mediaRows.length === 0) return null;

  const start =
    intent.startDate && intent.startDate.getTime() > Date.now() - 86_400_000
      ? intent.startDate
      : new Date();
  const durationDays = input.durationMonths
    ? Math.max(28, input.durationMonths * 30)
    : intent.durationDays;
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + durationDays - 1);

  const calculated = await calculateQuoteFromMediaIds(db, {
    mediaIds: mediaRows.map((m) => m.id),
    startDate: start,
    endDate: end,
    discountRate: 0,
  });

  const budgetRange = budgetRangeManwonFromCode(intent.budgetCode ?? undefined);
  const clientEmail =
    input.email?.trim() ||
    `inquiry+${input.inquiryId.slice(0, 12)}@no-reply.thinkad.co`;

  const ooh = await db.ooHQuote.create({
    data: {
      status: OoHQuoteStatus.draft,
      clientName: input.name.trim(),
      clientEmail,
      clientPhone: input.phone.trim() || null,
      clientCompany: input.company.trim() || null,
      mediaIds: mediaRows.map((m) => m.id),
      totalAmount: calculated.totalAmountManwon,
      period: periodLabelForDays(calculated.periodDays, locale),
      periodKey: null,
      budgetMin: budgetRange.min,
      budgetMax: budgetRange.max,
      startDate: calculated.startDate,
      endDate: calculated.endDate,
      validUntil: calculated.validUntilDate,
      discountRate: 0,
      pdfTemplate: "premium",
      locale,
      contactInquiryId: input.inquiryId,
      quoteBreakdown: {
        lines: calculated.lines,
        subtotalWon: calculated.subtotalWon,
        discountRate: calculated.discountRate,
        discountWon: calculated.discountWon,
        supplyWon: calculated.supplyWon,
        vatWon: calculated.vatWon,
        totalWon: calculated.totalWon,
        validUntil: calculated.validUntil,
        issuedAt: calculated.issuedAt,
      },
      adminNote: locale === "ko"
        ? input.durationMonths
          ? `문의 접수 시 자동 생성된 견적 초안 (${input.durationMonths}개월). 검토 후 발송하세요.`
          : "문의 접수 시 자동 생성된 견적 초안입니다. 검토 후 발송하세요."
        : input.durationMonths
          ? `Auto-generated draft (${input.durationMonths} mo). Review before sending.`
          : "Auto-generated draft from contact inquiry. Review before sending.",
    },
  });

  void postInternalAlert({
    type: "contact_inquiry",
    title: "새 문의 + 견적 초안 생성됨",
    body: `${input.company || "(회사미입력)"} / ${input.name} · ₩${calculated.totalAmountManwon.toLocaleString("ko-KR")}만`,
    meta: {
      contactInquiryId: input.inquiryId,
      oohQuoteId: ooh.id,
      mediaCount: mediaRows.length,
    },
  }).catch(() => {});

  void notifySlackInquiryQuoteDraft({
    inquiryId: input.inquiryId,
    quoteId: ooh.id,
    company: input.company,
    name: input.name,
    mediaCount: mediaRows.length,
    totalAmountManwon: calculated.totalAmountManwon,
  }).catch(() => {});

  void sendTelegramMessage(
    `📋 문의 견적 초안\n${input.name} (${input.company})\n매체 ${mediaRows.length}건 · ₩${calculated.totalAmountManwon}만\n${adminOohQuoteUrl(ooh.id)}`,
  ).catch(() => {});

  return { quoteId: ooh.id };
}
