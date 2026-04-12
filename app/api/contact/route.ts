import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";
import { getContactAdminNotifyEmail } from "@/lib/email/contact-admin-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { verifyTurnstileToken } from "@/lib/turnstile-verify";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-+() ]{8,}$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

/** Budget option values from contact-client selects + legacy keys. */
function budgetDisplay(raw: string | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "";
  const map: Record<string, string> = {
    under10m: "1천만 이하",
    under_10m: "1천만 이하",
    "10to50m": "1천~5천만",
    "10m_50m": "1천~5천만",
    "50to100m": "5천만~1억",
    over100m: "1억 이상",
    over_100m: "1억 이상",
  };
  return map[v] ?? v;
}

/** Inquiry type codes from contact-client + legacy. */
function inquiryTypeDisplay(raw: string | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "";
  const map: Record<string, string> = {
    media: "매체 문의",
    campaign: "캠페인 상담",
    quote: "견적 요청",
    partnership: "제휴 문의",
    other: "기타",
  };
  return map[v] ?? v;
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
    inquiryType,
    budget,
    message,
    cfTurnstileToken,
    turnstileToken,
  } = body as Record<string, string | undefined>;

  const cfToken = cfTurnstileToken ?? turnstileToken;
  const turnstile = await verifyTurnstileToken(cfToken, ip);
  if (!turnstile.ok) {
    return json({ error: "CAPTCHA verification failed" }, { status: 403 });
  }

  const errors: string[] = [];
  if (!name?.trim()) errors.push("name");
  if (!phone?.trim() || !PHONE_RE.test(phone ?? "")) errors.push("phone");
  if (email?.trim() && !EMAIL_RE.test(email)) errors.push("email");
  if (!message?.trim()) errors.push("message");

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

  const companyVal = company?.trim() ?? "";
  const nameVal = name!.trim();
  const phoneVal = phone!.trim();
  const emailVal = email?.trim() ?? "";
  const inquiryRaw = inquiryType?.trim() ?? "";
  const budgetRaw = budget?.trim() ?? "";
  const inquiryLabel = inquiryTypeDisplay(inquiryRaw) || inquiryRaw;
  const budgetLabel = budgetDisplay(budgetRaw) || budgetRaw;
  const messageVal = message!.trim();
  const metaLines: string[] = [];
  if (inquiryLabel) metaLines.push(`[문의 유형: ${inquiryLabel}]`);
  if (budgetLabel) metaLines.push(`[예상 예산: ${budgetLabel}]`);
  const composedMessage =
    metaLines.length > 0
      ? `${metaLines.join("\n")}\n\n${messageVal}`
      : messageVal;

  const hasValidEmail = !!(emailVal && EMAIL_RE.test(emailVal));

  try {
    const db = getPrisma();
    const base = {
      company: companyVal,
      name: nameVal,
      phone: phoneVal,
      message: composedMessage,
      ...(inquiryLabel ? { inquiryType: inquiryLabel } : {}),
      ...(budgetLabel ? { budget: budgetLabel } : {}),
    };

    try {
      await db.contactInquiry.create({
        data: {
          ...base,
          ...(hasValidEmail ? { email: emailVal } : {}),
        },
      });
    } catch (firstErr) {
      console.error("[contact] DB error (full row):", firstErr);
      try {
        await db.contactInquiry.create({
          data: {
            company: companyVal,
            name: nameVal,
            phone: phoneVal,
            message: composedMessage,
            ...(hasValidEmail ? { email: emailVal } : { email: "" }),
          },
        });
      } catch (secondErr) {
        console.error("[contact] DB error (compat row):", secondErr);
        const errMsg = secondErr instanceof Error ? secondErr.message : String(secondErr);
        return json(
          {
            error: "문의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
            detail: errMsg,
          },
          { status: 500 },
        );
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[contact] DB error:", errMsg, err);
    return json(
      {
        error: "문의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        detail: errMsg,
      },
      { status: 500 },
    );
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "새 문의 접수",
    body: `${companyVal || "(회사미입력)"} / ${nameVal} / ${phoneVal} · ${inquiryLabel || "—"} · ${budgetLabel || "—"}`,
    meta: {
      email: emailVal,
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
        email: emailVal,
        inquiryType: inquiryLabel,
        budget: budgetLabel,
        message: composedMessage,
      });
      await sendEmail({ to: alertTo, subject, text, html });
    } catch (err) {
      console.error("[contact] Admin notify email failed:", err);
    }
  }

  if (hasValidEmail) {
    try {
      const { subject, text, html } = getContactConfirmationEmail({
        name: name?.trim(),
      });
      await sendEmail({
        to: emailVal,
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
