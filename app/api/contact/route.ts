import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";
import { getContactAdminNotifyEmail } from "@/lib/email/contact-admin-notify";
import { postInternalAlert } from "@/lib/internal-webhook";

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

  const { company, name, phone, email, inquiryType, budget, message } = body as Record<
    string,
    string | undefined
  >;

  const errors: string[] = [];
  if (!name?.trim()) errors.push("name");
  if (!phone?.trim() || !PHONE_RE.test(phone ?? "")) errors.push("phone");
  if (!email?.trim() || !EMAIL_RE.test(email ?? "")) errors.push("email");
  if (!inquiryType?.trim()) errors.push("inquiryType");
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

  try {
    const db = getPrisma();
    await db.contactInquiry.create({
      data: {
        company: company?.trim() ?? "",
        name: name!.trim(),
        phone: phone!.trim(),
        email: email?.trim() ?? "",
        inquiryType: inquiryType?.trim() ?? "",
        budget: budget?.trim() ?? "",
        message: message!.trim(),
      },
    });
  } catch (err) {
    console.error("[contact] DB error:", err);
    return json({ error: "Failed to save inquiry" }, { status: 500 });
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "새 문의 접수",
    body: `${company?.trim() || "(회사미입력)"} / ${name!.trim()} / ${phone!.trim()}`,
    meta: {
      email: email?.trim() ?? "",
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
        email: email?.trim() ?? "",
        inquiryType: inquiryType?.trim() ?? "",
        budget: budget?.trim() ?? "",
        message: message!.trim(),
      });
      await sendEmail({ to: alertTo, subject, text, html });
    } catch (err) {
      console.error("[contact] Admin notify email failed:", err);
    }
  }

  if (email?.trim()) {
    try {
      const { subject, text, html } = getContactConfirmationEmail({
        name: name?.trim(),
      });
      await sendEmail({
        to: email.trim(),
        subject,
        text,
        html,
      });
    } catch (err) {
      console.error("[contact] Failed to send confirmation email:", err);
      // Do not fail the request if email sending fails
    }
  }

  return json({ success: true }, { status: 201 });
}
