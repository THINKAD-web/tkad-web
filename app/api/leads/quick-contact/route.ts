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

const PHONE_RE = /^[\d+\-\s()]{8,20}$/;
const limiter = rateLimit({ limit: 10, windowMs: 60_000 });

const Body = z.object({
  company: z.string().min(1).max(120),
  contact: z.string().min(8).max(80),
  memo: z.string().max(500).optional(),
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

/** 홈 모바일 고정 CTA — 회사명·연락처·메모 3필드 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(`quick-contact:${ip}`)) {
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

  const phone = d.contact.replace(/\s/g, "");
  if (!PHONE_RE.test(phone)) {
    return json({ ok: false, error: "invalid_contact" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  const isKo = (d.locale ?? "ko").startsWith("ko");
  const memo = d.memo?.trim() || "—";
  const message = [
    isKo ? "[홈 모바일 빠른 문의]" : "[Home mobile quick contact]",
    `회사: ${d.company}`,
    `연락처: ${d.contact}`,
    `메모: ${memo}`,
  ].join("\n");

  try {
    const db = getPrisma();
    const inquiry = await db.contactInquiry.create({
      data: {
        company: d.company.trim(),
        name: isKo ? "모바일 빠른 문의" : "Mobile quick contact",
        phone: d.contact.trim(),
        email: null,
        message,
        inquiryType: isKo ? "빠른 견적 (모바일)" : "Quick quote (mobile)",
        budget: "—",
      },
    });
    void import("@/lib/inquiry-auto-route").then(({ routeNewContactInquiry }) =>
      routeNewContactInquiry({
        inquiryId: inquiry.id,
        company: inquiry.company,
        name: inquiry.name,
        phone: inquiry.phone,
        message: inquiry.message,
        inquiryTypeLabel: inquiry.inquiryType ?? undefined,
        locale: isKo ? "ko" : "en",
      }).catch(console.error),
    );

    if (d.sessionId) {
      void touchVisitorJourney({
        sessionId: d.sessionId,
        step: "quick_contact_submit",
        mark: "quote_requested",
        metadata: { company: d.company },
      });
      void recordConversion({
        sessionId: d.sessionId,
        type: "quote_request",
        metadata: { source: "home_mobile_sticky" },
      });
    }

    void postInternalAlert({
      type: "contact_inquiry",
      title: isKo ? "홈 모바일 빠른 견적" : "Home mobile quick quote",
      body: `${d.company} · ${d.contact}`,
      meta: { memo },
    }).catch(() => {});

    const adminTo = resolveContactAlertEmail();
    if (isEmailConfigured() && adminTo) {
      void sendEmail({
        to: adminTo,
        subject: isKo
          ? `[TKAD] 모바일 빠른 견적 — ${d.company}`
          : `[TKAD] Mobile quick quote — ${d.company}`,
        text: message,
        html: `<pre>${message}</pre>`,
      }).catch((err) => console.error("[quick-contact] admin email:", err));
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[leads/quick-contact]", e);
    return json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
