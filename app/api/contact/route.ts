import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";
import { getContactAdminNotifyEmail } from "@/lib/email/contact-admin-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { verifyTurnstileToken } from "@/lib/turnstile-verify";
import {
  budgetLabel,
  composeStoredMessage,
  inquiryTypeLabel,
  parseBudgetCode,
  parseInquiryTypeCode,
} from "@/lib/contact-inquiry-labels";

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

  const {
    company,
    name,
    phone,
    email: emailRaw,
    budget: budgetRaw,
    message: messageRaw,
    inquiryType: inquiryRaw,
    locale: localeRaw,
    turnstileToken,
  } = body as Record<string, string | undefined>;

  const locale = localeRaw === "en" ? "en" : "ko";

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return json({ error: "Turnstile verification failed" }, { status: 403 });
  }

  const inquiryCode = parseInquiryTypeCode(inquiryRaw);
  const budgetCode = parseBudgetCode(budgetRaw);

  const errors: string[] = [];
  if (!name?.trim()) errors.push("name");
  if (!phone?.trim() || !PHONE_RE.test(phone ?? "")) errors.push("phone");
  if (!messageRaw?.trim()) errors.push("message");
  if (!inquiryCode) errors.push("inquiryType");
  if (!budgetCode) errors.push("budget");

  const emailOpt = emailRaw?.trim();
  if (emailOpt && !EMAIL_RE.test(emailOpt)) errors.push("email");

  if (errors.length > 0) {
    return json(
      { error: "Validation failed", fields: errors },
      { status: 400 },
    );
  }

  const inquiry = inquiryCode!;
  const budget = budgetCode!;

  const inquiryLbl = inquiryTypeLabel(inquiry, locale);
  const budgetLbl = budgetLabel(budget, locale);
  const composedMessage = composeStoredMessage(
    inquiryLbl,
    messageRaw!.trim(),
    locale,
    budgetLbl,
  );

  if (!isDatabaseConfigured()) {
    return json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  const companyVal = company?.trim() ?? "";
  const nameVal = name!.trim();
  const phoneVal = phone!.trim();
  const hasValidEmail = !!(emailOpt && EMAIL_RE.test(emailOpt));

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
          budget: budgetLbl,
          ...(hasValidEmail ? { email: emailOpt } : {}),
        },
      });
    } catch (firstErr) {
      console.error("[contact] DB error (full row):", firstErr);
      try {
        await db.contactInquiry.create({
          data: {
            ...base,
            ...(hasValidEmail ? { email: emailOpt } : { email: "" }),
          },
        });
      } catch (secondErr) {
        console.error("[contact] DB error (compat row):", secondErr);
        return json({ error: "Failed to save inquiry" }, { status: 500 });
      }
    }
  } catch (err) {
    console.error("[contact] DB error:", err);
    return json({ error: "Failed to save inquiry" }, { status: 500 });
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "새 문의 접수",
    body: `${company?.trim() || "(회사미입력)"} / ${name!.trim()} / ${phone!.trim()} · ${inquiryLbl} · ${budgetLbl}`,
    meta: {
      email: emailOpt ?? "",
      source: "contact_form",
    },
  }).catch(() => {});

  const alertTo = process.env.CONTACT_ALERT_EMAIL?.trim();
  if (alertTo) {
    try {
      const { subject, text, html } = getContactAdminNotifyEmail({
        company: company?.trim() ?? "",
        name: name!.trim(),
        phone: phone!.trim(),
        email: emailOpt ?? "",
        budget: budgetLbl,
        message: composedMessage,
      });
      await sendEmail({ to: alertTo, subject, text, html });
    } catch (err) {
      console.error("[contact] Admin notify email failed:", err);
    }
  }

  if (emailOpt && EMAIL_RE.test(emailOpt)) {
    try {
      const { subject, text, html } = getContactConfirmationEmail({
        name: name?.trim(),
      });
      await sendEmail({
        to: emailOpt,
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
