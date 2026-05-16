import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";
import { getContactAdminNotifyEmail } from "@/lib/email/contact-admin-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import {
  budgetLabel,
  composeStoredMessage,
  inquiryTypeLabel,
  parseBudgetCode,
  parseInquiryTypeCode,
} from "@/lib/contact-inquiry-labels";
import {
  budgetLabelV2,
  composeContactLeadStoredMessage,
  inquiryTypeLabelV2,
  parseCampaignGoalsFromBody,
  parseContactBudgetV2,
  parseContactIndustry,
  parseContactInquiryTypeV2,
  parseRegionsFromBody,
} from "@/lib/contact-lead-schema";

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
  const {
    company: companyRaw,
    name: nameRaw,
    phone: phoneRaw,
    email: emailRaw,
    budget: budgetRaw,
    message: messageRaw,
    inquiryType: inquiryRaw,
    locale: localeRaw,
    startDate: startDateRaw,
    additionalNotes: additionalNotesRaw,
    industry: industryRaw,
    campaignGoals: campaignGoalsRaw,
    regions: regionsRaw,
  } = raw;

  /** 레거시 문의 클라이언트는 `cfTurnstileToken` 키를 사용할 수 있음 */
  const turnstileToken =
    (raw.turnstileToken ?? raw.cfTurnstileToken) as string | undefined;

  const locale = localeRaw === "en" ? "en" : "ko";

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

  const company = typeof companyRaw === "string" ? companyRaw : "";
  const name = typeof nameRaw === "string" ? nameRaw : "";
  const phone = typeof phoneRaw === "string" ? phoneRaw : "";
  const emailStr = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const startDate =
    typeof startDateRaw === "string" ? startDateRaw.trim() : "";
  const additionalNotes =
    typeof additionalNotesRaw === "string"
      ? additionalNotesRaw.trim()
      : typeof messageRaw === "string"
        ? messageRaw.trim()
        : "";

  const inquiryV2 = parseContactInquiryTypeV2(
    typeof inquiryRaw === "string" ? inquiryRaw : undefined,
  );
  const industryV2 = parseContactIndustry(
    typeof industryRaw === "string" ? industryRaw : undefined,
  );
  const budgetV2 = parseContactBudgetV2(
    typeof budgetRaw === "string" ? budgetRaw : undefined,
  );
  const goalsV2 = parseCampaignGoalsFromBody(campaignGoalsRaw);
  const regionsV2 = parseRegionsFromBody(regionsRaw);

  const errors: string[] = [];

  if (!name.trim()) errors.push("name");
  if (!phone.trim() || !PHONE_RE.test(phone)) errors.push("phone");

  let inquiryLbl: string;
  let budgetLbl: string;
  let composedMessage: string;

  if (inquiryV2) {
    if (!emailStr || !EMAIL_RE.test(emailStr)) errors.push("email");
    if (!company.trim()) errors.push("company");
    if (!budgetV2) errors.push("budget");
    if (!industryV2) errors.push("industry");
    if (!goalsV2) errors.push("campaignGoals");
    if (!regionsV2) errors.push("regions");
    if (!startDate || Number.isNaN(Date.parse(startDate))) {
      errors.push("startDate");
    }
    if (!additionalNotes) errors.push("additionalNotes");
    if (errors.length > 0) {
      return json(
        { error: "validation_failed", fields: errors },
        { status: 400 },
      );
    }
    inquiryLbl = inquiryTypeLabelV2(inquiryV2, locale);
    budgetLbl = budgetLabelV2(budgetV2!, locale);
    composedMessage = composeContactLeadStoredMessage({
      locale,
      inquiryType: inquiryV2,
      budget: budgetV2!,
      industry: industryV2!,
      campaignGoals: goalsV2!,
      regions: regionsV2!,
      startDate,
      additionalNotes,
    });
  } else {
    /** Legacy 단일 폼 (message + 구 inquiry 코드) */
    const inquiryCode = parseInquiryTypeCode(
      typeof inquiryRaw === "string" ? inquiryRaw : undefined,
    );
    const budgetCode = parseBudgetCode(
      typeof budgetRaw === "string" ? budgetRaw : undefined,
    );

    if (!additionalNotes) errors.push("message");
    if (!inquiryCode) errors.push("inquiryType");
    if (!budgetCode) errors.push("budget");
    if (emailStr && !EMAIL_RE.test(emailStr)) errors.push("email");

    if (errors.length > 0) {
      return json(
        { error: "validation_failed", fields: errors },
        { status: 400 },
      );
    }

    inquiryLbl = inquiryTypeLabel(inquiryCode!, locale);
    budgetLbl = budgetLabel(budgetCode!, locale);
    composedMessage = composeStoredMessage(
      inquiryLbl,
      additionalNotes,
      locale,
      budgetLbl,
    );
  }

  if (!isDatabaseConfigured()) {
    return json(
      { error: "service_unavailable" },
      { status: 503 },
    );
  }

  const companyVal = company.trim();
  const nameVal = name.trim();
  const phoneVal = phone.trim();
  const hasValidEmail =
    emailStr.length > 0 && EMAIL_RE.test(emailStr);

  try {
    const db = getPrisma();
    const base = {
      company: companyVal,
      name: nameVal,
      phone: phoneVal,
      message: composedMessage,
    };

    try {
      await db.contactInquiry.create({
        data: {
          ...base,
          inquiryType: inquiryLbl,
          budget: budgetLbl,
          ...(hasValidEmail ? { email: emailStr } : {}),
        },
      });
    } catch (firstErr) {
      console.error("[contact] DB error (full row):", firstErr);
      try {
        await db.contactInquiry.create({
          data: {
            ...base,
            ...(hasValidEmail ? { email: emailStr } : { email: "" }),
          },
        });
      } catch (secondErr) {
        console.error("[contact] DB error (compat row):", secondErr);
        return json({ error: "save_failed" }, { status: 500 });
      }
    }
  } catch (err) {
    console.error("[contact] DB error:", err);
    return json({ error: "save_failed" }, { status: 500 });
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "새 문의 접수",
    body: `${companyVal || "(회사미입력)"} / ${nameVal} / ${phoneVal} · ${inquiryLbl} · ${budgetLbl}`,
    meta: {
      email: emailStr,
      source: "contact_form",
    },
  }).catch(() => {});

  const alertTo = process.env.CONTACT_ALERT_EMAIL?.trim();
  if (alertTo) {
    try {
      const { subject, text, html } = getContactAdminNotifyEmail({
        company: companyVal,
        name: nameVal,
        phone: phoneVal,
        email: emailStr,
        budget: budgetLbl,
        message: composedMessage,
        inquiryType: inquiryLbl,
      });
      await sendEmail({ to: alertTo, subject, text, html });
    } catch (err) {
      console.error("[contact] Admin notify email failed:", err);
    }
  }

  if (hasValidEmail) {
    try {
      const { subject, text, html } = getContactConfirmationEmail({
        name: nameVal,
      });
      await sendEmail({
        to: emailStr,
        subject,
        text,
        html,
      });
    } catch (err) {
      console.error("[contact] Failed to send confirmation email:", err);
    }
  }

  return json({ success: true }, { status: 201 });
}
