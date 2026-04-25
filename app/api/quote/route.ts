import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/seo";
import { OoHQuoteStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { autoLinkQuoteRequestToCampaign } from "@/lib/quote-campaign-link";
import { rateLimit } from "@/lib/rate-limit";
import { postInternalAlert } from "@/lib/internal-webhook";
import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";
import {
  estimateEndDate,
  OOH_PERIOD_MONTHS,
  periodLabelFromKey,
} from "@/lib/ooh-quote";
import { ooHQuotePdfToBase64 } from "@/lib/server-ooh-quote-pdf";
import {
  adminOohQuoteUrl,
  sendTelegramMessage,
} from "@/lib/telegram-notify";
import { sendQuoteSalesSlack } from "@/lib/quote/notifiers/sales-slack";
import { sendQuoteSalesEmail } from "@/lib/quote/notifiers/sales-email";
import {
  defaultQuoteExpiresAt,
  issueQuoteNumberInTx,
} from "@/lib/quote/quote-number";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

const PHONE_RE = /^[\d\-+() ]{8,}$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function parseOptionalInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.website) {
    return json({ success: true }, { status: 201 });
  }

  const {
    company,
    name,
    phone,
    email,
    mediaIds,
    period,
    budgetMin,
    budgetMax,
    estimatedCost,
    message,
    pdfTemplate,
    locale: localeBody,
    networkSelections: networkSelectionsRaw,
    // PR-9 — 마법사 확장 필드(모두 선택)
    customerBusinessNumber,
    customerAddress,
    customerPosition,
    creativeMode,
    creativeAssets,
    compositeLogoUrl,
    designBrief,
    needsDesignService,
    timeSlot,
    quoteSource,
    quoteSourceId,
  } = body as Record<string, unknown>;

  const ids = Array.isArray(mediaIds)
    ? mediaIds
        .map((id) => {
          if (typeof id === "string") return id.trim();
          if (typeof id === "number" && Number.isFinite(id))
            return String(Math.trunc(id));
          return "";
        })
        .filter(Boolean)
    : [];

  const errors: string[] = [];
  if (!String(name ?? "").trim()) errors.push("name");
  if (!String(phone ?? "").trim() || !PHONE_RE.test(String(phone ?? ""))) {
    errors.push("phone");
  }
  if (ids.length < 1) errors.push("mediaIds");

  if (errors.length > 0) {
    return json(
      { error: "Validation failed", fields: errors },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  const budgetMinN = parseOptionalInt(budgetMin);
  const budgetMaxN = parseOptionalInt(budgetMax);
  const estimatedN = parseOptionalInt(estimatedCost);

  const periodKeyRaw = period != null ? String(period).trim() : "1month";
  const periodKey =
    periodKeyRaw in OOH_PERIOD_MONTHS ? periodKeyRaw : "1month";
  const localeStr =
    String(localeBody ?? "").toLowerCase() === "en" ? "en" : "ko";
  const periodHuman = periodLabelFromKey(periodKey, localeStr);

  let networkSelectionsJson: unknown = undefined;
  if (Array.isArray(networkSelectionsRaw)) {
    const cleaned = networkSelectionsRaw
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const o = x as Record<string, unknown>;
        return {
          catalogId:
            typeof o.catalogId === "string" ? o.catalogId.trim() : "",
          units: typeof o.units === "number" ? Math.round(o.units) : undefined,
          regionScope:
            typeof o.regionScope === "string" ? o.regionScope : "all",
          lineTotal:
            typeof o.lineTotal === "number" && Number.isFinite(o.lineTotal)
              ? Math.round(o.lineTotal)
              : undefined,
        };
      })
      .filter((x) => x.catalogId.length > 0);
    if (cleaned.length > 0) networkSelectionsJson = cleaned;
  }
  const tplRaw = String(pdfTemplate ?? "").trim();
  const pdfTpl = tplRaw === "premium" ? "premium" : "default";
  const startDate = new Date();
  const endDate = estimateEndDate(startDate, periodKey);
  const totalAmount =
    estimatedN != null && Number.isFinite(estimatedN)
      ? Math.round(estimatedN)
      : 0;

  try {
    const db = getPrisma();
    const emailNorm = String(email ?? "").trim() || null;
    const clientEmailNorm = emailNorm ?? "";

    const result = await db.$transaction(async (tx) => {
      const created = await tx.quoteRequest.create({
        data: {
          company: String(company ?? "").trim(),
          name: String(name).trim(),
          phone: String(phone).trim(),
          email: emailNorm,
          mediaIds: JSON.stringify(ids),
          period: periodKey,
          budgetMin: budgetMinN,
          budgetMax: budgetMaxN,
          estimatedCost: estimatedN,
          message: String(message ?? "").trim() || null,
        },
      });

      // PR-9: 같은 트랜잭션 안에서 advisory lock 으로 견적 번호 발급 → 동시성 안전.
      const quoteNumber = await issueQuoteNumberInTx(tx);

      const allowedSources = ["planner", "media", "compare", "direct"];
      const sourceClean =
        typeof quoteSource === "string" && allowedSources.includes(quoteSource)
          ? (quoteSource as "planner" | "media" | "compare" | "direct")
          : null;
      const allowedCreativeModes = [
        "upload",
        "composite",
        "design_request",
        "later",
      ];
      const creativeModeClean =
        typeof creativeMode === "string" &&
        allowedCreativeModes.includes(creativeMode)
          ? creativeMode
          : null;
      const allowedTimeSlots = [
        "all_day",
        "rush_hour",
        "lunch_evening",
        "night",
        "custom",
      ];
      const timeSlotClean =
        typeof timeSlot === "string" && allowedTimeSlots.includes(timeSlot)
          ? timeSlot
          : null;

      const ooh = await tx.ooHQuote.create({
        data: {
          status: OoHQuoteStatus.draft,
          clientName: String(name).trim(),
          clientEmail: clientEmailNorm,
          clientPhone: String(phone).trim(),
          clientCompany: String(company ?? "").trim() || null,
          mediaIds: ids,
          totalAmount,
          period: periodHuman,
          periodKey,
          budgetMin: budgetMinN,
          budgetMax: budgetMaxN,
          startDate,
          endDate,
          pdfTemplate: pdfTpl,
          locale: localeStr,
          quoteRequestId: created.id,
          networkSelections: networkSelectionsJson ?? undefined,
          // PR-9 신규 필드
          quoteNumber,
          customerBusinessNumber:
            typeof customerBusinessNumber === "string"
              ? customerBusinessNumber.trim() || null
              : null,
          customerAddress:
            typeof customerAddress === "string"
              ? customerAddress.trim() || null
              : null,
          customerPosition:
            typeof customerPosition === "string"
              ? customerPosition.trim() || null
              : null,
          customerMessage: String(message ?? "").trim() || null,
          creativeMode: creativeModeClean,
          creativeAssets:
            Array.isArray(creativeAssets) && creativeAssets.length > 0
              ? (creativeAssets as unknown as object)
              : undefined,
          compositeLogoUrl:
            typeof compositeLogoUrl === "string" && compositeLogoUrl.trim()
              ? compositeLogoUrl.trim()
              : null,
          designBrief:
            designBrief && typeof designBrief === "object"
              ? (designBrief as object)
              : undefined,
          needsDesignService: Boolean(needsDesignService),
          timeSlot: timeSlotClean,
          expiresAt: defaultQuoteExpiresAt(),
          quoteSource: sourceClean,
          quoteSourceId:
            typeof quoteSourceId === "string"
              ? quoteSourceId.trim() || null
              : null,
        },
      });

      return { quoteRequest: created, oohQuote: ooh };
    });

    const { quoteRequest: created, oohQuote: ooh } = result;

    let pdfEmailed = false;
    if (clientEmailNorm && isEmailConfigured()) {
      try {
        const pdfBase64 = await ooHQuotePdfToBase64(db, {
          clientCompany: ooh.clientCompany,
          clientName: ooh.clientName,
          period: ooh.period,
          periodKey: ooh.periodKey,
          budgetMin: ooh.budgetMin,
          budgetMax: ooh.budgetMax,
          pdfTemplate: ooh.pdfTemplate,
          locale: ooh.locale,
          mediaIds: ooh.mediaIds,
          totalAmount: ooh.totalAmount,
          networkSelections: ooh.networkSelections ?? undefined,
        });
        const isKo = localeStr === "ko";
        await sendEmailWithPdfAttachment({
          to: clientEmailNorm,
          subject: isKo
            ? "[싱커드] 견적서가 도착했습니다"
            : "[THINKAD] Your quote",
          text: isKo
            ? `첨부 PDF는 요청하신 매체 기준 참고 견적입니다.\n\n견적 확인 및 진행: ${siteUrl}/ko/quote/${ooh.id}\n진행 상황 확인: ${siteUrl}/ko/quote/${ooh.id}/status`
            : `Please find your reference quote attached.\n\nView & proceed: ${siteUrl}/en/quote/${ooh.id}\nTrack status: ${siteUrl}/en/quote/${ooh.id}/status`,
          html: isKo
            ? `<p>첨부 PDF는 요청하신 매체 기준 참고 견적입니다.</p><p>📋 <a href="${siteUrl}/ko/quote/${ooh.id}"><strong>견적 확인 및 진행하기 →</strong></a></p><p>📊 <a href="${siteUrl}/ko/quote/${ooh.id}/status">진행 상황 확인하기 →</a></p>`
            : `<p>Please find your reference quote attached.</p><p>📋 <a href="${siteUrl}/en/quote/${ooh.id}"><strong>View & Proceed →</strong></a></p><p>📊 <a href="${siteUrl}/en/quote/${ooh.id}/status">Track Status →</a></p>`,
          pdfFilename: "thinkad-quote.pdf",
          pdfBase64,
        });
        pdfEmailed = true;
      } catch (e) {
        console.error("[quote] PDF email failed:", e);
      }
    }

    await db.ooHQuote.update({
      where: { id: ooh.id },
      data: {
        status: OoHQuoteStatus.sent,
        quotePdfSentAt: pdfEmailed ? new Date() : null,
      },
    });

    void postInternalAlert({
      type: "quote_request",
      title: "새 견적 요청 (OOH 파이프라인)",
      body: `${String(company ?? "").trim() || "-"} / ${String(name).trim()} · ₩${totalAmount.toLocaleString("ko-KR")}만 · ${periodHuman}`,
      meta: {
        email: emailNorm,
        mediaCount: ids.length,
        oohQuoteId: ooh.id,
      },
    }).catch(() => {});

    const adminUrl = adminOohQuoteUrl(ooh.id);
    void sendTelegramMessage(
      `<b>새 견적 요청</b>\n${String(name).trim()} · ${String(company ?? "").trim() || "-"}\n매체 ${ids.length}건 · ₩${totalAmount.toLocaleString("ko-KR")}만 · ${periodHuman}`,
      { buttons: [{ text: "확인하기", url: adminUrl }] },
    ).catch(() => {});

    // PR-8: 영업팀 Slack #sales-leads + 이메일 알림 — fire-and-forget.
    // 실패해도 사용자 응답 흐름에 영향 없음(catch 무음).
    const salesPayload = {
      quoteId: ooh.id,
      clientName: String(name).trim(),
      clientCompany: String(company ?? "").trim() || null,
      clientEmail: emailNorm,
      clientPhone: String(phone).trim() || null,
      mediaCount: ids.length,
      periodLabel: periodHuman,
      totalAmountMan: totalAmount,
      adminUrl,
      message: String(message ?? "").trim() || null,
    };
    void sendQuoteSalesSlack(salesPayload).catch(() => {});
    void sendQuoteSalesEmail(salesPayload).catch(() => {});

    await autoLinkQuoteRequestToCampaign(db, created.id, emailNorm);

    return json(
      {
        success: true,
        quoteId: ooh.id,
        quoteNumber: ooh.quoteNumber,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[quote] DB error:", err);
    return json({ error: "Failed to save quote request" }, { status: 500 });
  }
}
