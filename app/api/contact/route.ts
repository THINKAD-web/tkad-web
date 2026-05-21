import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";
import {
  getContactAdminNotifyEmail,
  resolveContactAlertEmail,
} from "@/lib/email/contact-admin-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifyInquiryReceived } from "@/lib/kakao-alimtalk-notify";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import {
  budgetLabel,
  composeStoredMessage,
  inquiryTypeLabel,
  parseBudgetCode,
  parseInquiryTypeCode,
} from "@/lib/contact-inquiry-labels";
import {
  composeContactLeadStoredMessage,
  contactLeadSchema,
  isContactLeadV2Payload,
  type ContactBudgetV2,
  type ContactIndustry,
  type ContactRegion,
} from "@/lib/contact-lead-schema";
import { createInquiryQuoteDraft } from "@/lib/inquiry-quote-draft";
import { notifyMediaOwnersForMediaIds } from "@/lib/media-owner-inquiry-notify";
import { recordConversion } from "@/lib/tracking/record";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-+() ]{8,}$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
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

  const raw = body as Record<string, unknown>;
  const locale = raw.locale === "en" ? "en" : "ko";
  const turnstileToken =
    (typeof raw.turnstileToken === "string" ? raw.turnstileToken : undefined) ??
    (typeof raw.cfTurnstileToken === "string" ? raw.cfTurnstileToken : undefined);

  const turnstile = await verifyTurnstileForRequest({
    token: turnstileToken,
    remoteip: ip,
    host: request.headers.get("host"),
  });
  if (!turnstile.ok) {
    return json(
      { error: "turnstile_failed", reason: turnstile.reason },
      { status: 403 },
    );
  }

  let companyVal = "";
  let nameVal = "";
  let phoneVal = "";
  let emailStr = "";
  let inquiryLbl = "";
  let budgetLbl = "";
  let industryLbl = "";
  let goalsLbl = "";
  let regionsLbl = "";
  let startDateLbl = "";
  let composedMessage = "";
  let leadMediaIds: string[] = [];
  let leadRegions: ContactRegion[] = [];
  let leadBudgetCode: ContactBudgetV2 | undefined;
  let leadIndustry: ContactIndustry | undefined;
  let leadStartDateRaw = "";

  if (isContactLeadV2Payload(raw)) {
    const parsed = contactLeadSchema.safeParse({ ...raw, locale, turnstileToken });
    if (!parsed.success) {
      const fields = [
        ...new Set(
          parsed.error.issues.map((i) => String(i.path[0] ?? "form")),
        ),
      ];
      return json({ error: "validation_failed", fields }, { status: 400 });
    }

    const lead = parsed.data;
    const composed = composeContactLeadStoredMessage(lead, locale);
    companyVal = lead.company.trim();
    nameVal = lead.name.trim();
    phoneVal = lead.phone?.trim() ?? "";
    emailStr = lead.email?.trim() ?? "";
    inquiryLbl = composed.inquiryLabel;
    budgetLbl = composed.budgetLabel;
    industryLbl = composed.industryLabel;
    goalsLbl = composed.goalsLabel;
    regionsLbl = composed.regionsLabel;
    startDateLbl = composed.startDateLabel;
    composedMessage = composed.storedMessage;
    leadMediaIds = lead.mediaIds ?? [];
    leadRegions = lead.regions;
    leadBudgetCode = lead.budget;
    leadStartDateRaw = lead.startDate?.trim() ?? "";
    leadIndustry = lead.industry;
  } else {
    const name = typeof raw.name === "string" ? raw.name : "";
    const phone = typeof raw.phone === "string" ? raw.phone : "";
    const messageRaw =
      typeof raw.message === "string" ? raw.message
      : typeof raw.additionalNotes === "string" ? raw.additionalNotes
      : "";
    const inquiryCode = parseInquiryTypeCode(
      typeof raw.inquiryType === "string" ? raw.inquiryType : undefined,
    );
    const budgetCode = parseBudgetCode(
      typeof raw.budget === "string" ? raw.budget : undefined,
    );
    emailStr = typeof raw.email === "string" ? raw.email.trim() : "";
    companyVal = typeof raw.company === "string" ? raw.company.trim() : "";

    const errors: string[] = [];
    if (!name.trim()) errors.push("name");
    if (!phone.trim() || !PHONE_RE.test(phone)) errors.push("phone");
    if (!messageRaw.trim()) errors.push("message");
    if (!inquiryCode) errors.push("inquiryType");
    if (!budgetCode) errors.push("budget");
    if (emailStr && !EMAIL_RE.test(emailStr)) errors.push("email");

    if (errors.length > 0) {
      return json({ error: "validation_failed", fields: errors }, { status: 400 });
    }

    nameVal = name.trim();
    phoneVal = phone.trim();
    inquiryLbl = inquiryTypeLabel(inquiryCode!, locale);
    budgetLbl = budgetLabel(budgetCode!, locale);
    composedMessage = composeStoredMessage(
      inquiryLbl,
      messageRaw.trim(),
      locale,
      budgetLbl,
    );
  }

  const hasValidEmail = !!(emailStr && EMAIL_RE.test(emailStr));

  if (!isDatabaseConfigured()) {
    return json({ error: "service_unavailable" }, { status: 503 });
  }

  let inquiryId: string | null = null;

  try {
    const db = getPrisma();
    const base = {
      company: companyVal,
      name: nameVal,
      phone: phoneVal || (hasValidEmail ? "—" : "-"),
      message: composedMessage,
    };

    const legacyMediaRaw =
      typeof raw.media === "string"
        ? raw.media.split(/[,，\s]+/).filter(Boolean)
        : Array.isArray(raw.mediaIds)
          ? raw.mediaIds.map(String).filter(Boolean)
          : [];
    const explicitMediaIds = [
      ...new Set([...leadMediaIds, ...legacyMediaRaw]),
    ];

    try {
      const inquiry = await db.contactInquiry.create({
        data: {
          ...base,
          inquiryType: inquiryLbl,
          budget: budgetLbl,
          ...(hasValidEmail ? { email: emailStr } : {}),
        },
      });
      inquiryId = inquiry.id;
    } catch (firstErr) {
      console.error("[contact] DB error (full row):", firstErr);
      try {
        const inquiry = await db.contactInquiry.create({
          data: {
            ...base,
            ...(hasValidEmail ? { email: emailStr } : { email: "" }),
          },
        });
        inquiryId = inquiry.id;
      } catch (secondErr) {
        console.error("[contact] DB error (compat row):", secondErr);
        return json({ error: "save_failed" }, { status: 500 });
      }
    }

      if (inquiryId) {
        void import("@/lib/inquiry-auto-route").then(({ routeNewContactInquiry }) =>
          routeNewContactInquiry({
            inquiryId: inquiryId!,
            company: companyVal,
            name: nameVal,
            phone: phoneVal,
            email: hasValidEmail ? emailStr : null,
            message: composedMessage,
            inquiryTypeLabel: inquiryLbl,
            budgetLabel: budgetLbl,
            industryCode: leadIndustry,
            budgetCode: leadBudgetCode,
            regions: leadRegions,
            locale,
          }).catch((err) => console.error("[contact] auto-route:", err)),
        );
        void recordConversion({ type: "quote_request", metadata: { inquiryId } });
        void createInquiryQuoteDraft(db, {
          inquiryId,
          company: companyVal,
          name: nameVal,
          phone: phoneVal,
          email: hasValidEmail ? emailStr : null,
          message: composedMessage,
          budgetLabel: budgetLbl,
          locale,
          explicitMediaIds,
          startDateRaw: leadStartDateRaw,
          regions: leadRegions,
          budgetCode: leadBudgetCode,
        }).catch((err) => {
          console.error("[contact] inquiry quote draft:", err);
        });
        if (explicitMediaIds.length > 0) {
          void notifyMediaOwnersForMediaIds(explicitMediaIds).catch((err) =>
            console.error("[contact] media owner notify:", err),
          );
        }
        void import("@/lib/media-owner-match").then(({ createMatchFromContactInquiry }) =>
          createMatchFromContactInquiry({
            contactInquiryId: inquiryId!,
            message: composedMessage,
            budgetLabel: budgetLbl,
            budgetCode: leadBudgetCode,
            regions: leadRegions,
            industryCode: leadIndustry,
            periodLabel: startDateLbl || undefined,
            explicitMediaIds,
          }).catch((err) => console.error("[contact] owner match:", err)),
        );
      }
  } catch (err) {
    console.error("[contact] DB error:", err);
    return json({ error: "save_failed" }, { status: 500 });
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: inquiryId ? "새 문의 + 견적 초안 생성됨" : "새 문의 접수",
    body: `${companyVal || "(회사미입력)"} / ${nameVal} / ${phoneVal || emailStr} · ${inquiryLbl}`,
    meta: {
      email: emailStr,
      source: "contact_form",
      contactInquiryId: inquiryId,
    },
  }).catch(() => {});

  try {
    const { subject, text, html } = getContactAdminNotifyEmail({
      company: companyVal,
      name: nameVal,
      phone: phoneVal,
      email: emailStr,
      inquiryType: inquiryLbl,
      budget: budgetLbl,
      industry: industryLbl || undefined,
      campaignGoals: goalsLbl || undefined,
      regions: regionsLbl || undefined,
      startDate: startDateLbl || undefined,
      message: composedMessage,
    });
    await sendEmail({ to: resolveContactAlertEmail(), subject, text, html });
  } catch (err) {
    console.error("[contact] Admin notify email failed:", err);
  }

  if (hasValidEmail) {
    try {
      const { subject, text, html } = getContactConfirmationEmail({
        name: nameVal,
      });
      await sendEmail({ to: emailStr, subject, text, html });
    } catch (err) {
      console.error("[contact] Failed to send confirmation email:", err);
    }
  }

  if (phoneVal && PHONE_RE.test(phoneVal)) {
    void notifyInquiryReceived({ phone: phoneVal, name: nameVal }).catch((err) => {
      console.error("[contact] alimtalk:", err);
    });
  }

  return json({ success: true }, { status: 201 });
}
