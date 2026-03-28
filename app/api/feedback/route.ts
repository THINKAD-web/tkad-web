import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";
import {
  getFeedbackAdminEmail,
  type FeedbackAnswers,
} from "@/lib/email/feedback-notify";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 8, windowMs: 60_000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function generateCouponCode(): string {
  return `THINKAD-FB-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function parseAnswers(body: Record<string, unknown>): {
  ok: true;
  answers: FeedbackAnswers;
  email: string;
} | { ok: false; error: string } {
  const email = String(body.email ?? "").trim();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "email" };
  }

  const serviceSatisfaction = Number(body.serviceSatisfaction);
  const nps = Number(body.nps);
  const campaign = body.campaign as string;

  if (
    !Number.isInteger(serviceSatisfaction) ||
    serviceSatisfaction < 1 ||
    serviceSatisfaction > 5
  ) {
    return { ok: false, error: "serviceSatisfaction" };
  }
  if (!Number.isInteger(nps) || nps < 0 || nps > 10) {
    return { ok: false, error: "nps" };
  }
  if (!["yes", "no", "na"].includes(campaign)) {
    return { ok: false, error: "campaign" };
  }

  let campaignResult: number | undefined;
  if (campaign === "yes") {
    const cr = body.campaignResult != null ? Number(body.campaignResult) : NaN;
    if (!Number.isInteger(cr) || cr < 1 || cr > 5) {
      return { ok: false, error: "campaignResult" };
    }
    campaignResult = cr;
  }

  const answers: FeedbackAnswers = {
    name: String(body.name ?? "").trim() || undefined,
    company: String(body.company ?? "").trim() || undefined,
    serviceSatisfaction,
    nps,
    campaign: campaign as "yes" | "no" | "na",
    campaignResult,
    campaignComment: String(body.campaignComment ?? "").trim() || undefined,
    improvement: String(body.improvement ?? "").trim() || undefined,
  };

  return { ok: true, email, answers };
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

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (raw.website) {
    return json({ success: true, couponCode: generateCouponCode() }, { status: 201 });
  }

  const parsed = parseAnswers(raw);
  if (!parsed.ok) {
    return json(
      { error: "Validation failed", field: parsed.error },
      { status: 400 },
    );
  }

  const { email, answers } = parsed;
  const couponCode = generateCouponCode();

  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      await db.customerFeedback.create({
        data: {
          email,
          answers: answers as Prisma.InputJsonValue,
          coupon: couponCode,
        },
      });
    } catch (err) {
      console.error("[feedback] DB error:", err);
    }
  }

  const alertTo = process.env.FEEDBACK_ALERT_EMAIL?.trim();
  if (alertTo) {
    try {
      const { subject, text, html } = getFeedbackAdminEmail({
        email,
        coupon: couponCode,
        answers,
      });
      await sendEmail({ to: alertTo, subject, text, html });
    } catch (err) {
      console.error("[feedback] Admin notify email failed:", err);
    }
  }

  return json(
    {
      success: true,
      couponCode,
      couponNote:
        "Next quote request: 5% off media planning fee (demo terms; subject to contract).",
    },
    { status: 201 },
  );
}
