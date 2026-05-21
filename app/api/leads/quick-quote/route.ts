import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { recordConversion } from "@/lib/tracking/record";
import { touchVisitorJourney } from "@/lib/visitor-journey";
import { postInternalAlert } from "@/lib/internal-webhook";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { resolveContactAlertEmail } from "@/lib/email/contact-admin-notify";

export const dynamic = "force-dynamic";

const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const limiter = rateLimit({ limit: 8, windowMs: 60_000 });

const Body = z.object({
  company: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  budget: z.string().min(1).max(80),
  region: z.string().min(1).max(80),
  startDate: z.string().min(1).max(40),
  sessionId: z.string().min(8).max(64).optional(),
  locale: z.string().max(8).optional(),
  website: z.string().max(0).optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(`quick-quote:${ip}`)) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "validation_failed" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) return json({ ok: true });

  const phone = d.phone.replace(/\s/g, "");
  if (!PHONE_RE.test(phone)) {
    return json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  const isKo = (d.locale ?? "ko").startsWith("ko");
  const message = [
    isKo ? "[홈 모바일 빠른 견적]" : "[Home mobile quick quote]",
    `회사: ${d.company}`,
    `예산: ${d.budget}`,
    `지역: ${d.region}`,
    `시작일: ${d.startDate}`,
  ].join("\n");

  try {
    const db = getPrisma();
    const inquiry = await db.contactInquiry.create({
      data: {
        company: d.company.trim(),
        name: d.company.trim(),
        phone,
        message,
        inquiryType: isKo ? "빠른 견적 (홈)" : "Quick quote (home)",
        budget: d.budget,
      },
    });

    void recordConversion({
      type: "quote_request",
      sessionId: d.sessionId,
      metadata: { inquiryId: inquiry.id, source: "home_quick_quote" },
    });

    if (d.sessionId) {
      void touchVisitorJourney({
        sessionId: d.sessionId,
        step: "quick_quote",
        path: "/",
        mark: "quick_quote",
        metadata: { inquiryId: inquiry.id },
      });
      void touchVisitorJourney({
        sessionId: d.sessionId,
        step: "quote_request",
        mark: "quote_requested",
        metadata: { inquiryId: inquiry.id, source: "home_quick_quote" },
      });
    }

    void postInternalAlert({
      type: "contact_inquiry",
      title: "홈 빠른 견적",
      body: `${d.company} / ${phone} · ${d.budget} · ${d.region}`,
      meta: { contactInquiryId: inquiry.id, source: "home_quick_quote" },
    }).catch(() => {});

    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: resolveContactAlertEmail(),
          subject: `[TKAD] 홈 빠른 견적 — ${d.company}`,
          text: message,
          html: `<pre>${message}</pre>`,
        });
      } catch (err) {
        console.error("[quick-quote] admin email:", err);
      }
    }

    return json({ ok: true, inquiryId: inquiry.id });
  } catch (e) {
    console.error("[leads/quick-quote]", e);
    return json({ ok: false }, { status: 500 });
  }
}
