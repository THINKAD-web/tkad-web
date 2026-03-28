import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { getContactConfirmationEmail } from "@/lib/email/contact-confirmation";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-+() ]{8,}$/;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const { company, name, phone, email, budget, message } = body as Record<
    string,
    string | undefined
  >;

  const errors: string[] = [];
  if (!name?.trim()) errors.push("name");
  if (!phone?.trim() || !PHONE_RE.test(phone ?? "")) errors.push("phone");
  if (!email?.trim() || !EMAIL_RE.test(email ?? "")) errors.push("email");
  if (!message?.trim()) errors.push("message");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", fields: errors },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
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
        budget: budget?.trim() ?? "",
        message: message!.trim(),
      },
    });
  } catch (err) {
    console.error("[contact] DB error:", err);
    return NextResponse.json(
      { error: "Failed to save inquiry" },
      { status: 500 },
    );
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

  return NextResponse.json({ success: true }, { status: 201 });
}
