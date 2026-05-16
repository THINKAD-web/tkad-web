import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

/**
 * POST /api/newsletter — 트렌드 리포트 뉴스레터 구독.
 * - 새 모델 `NewsletterSubscriber` 에 upsert. 이미 존재하면 unsubscribedAt 만 null 로 갱신해 재활성화.
 * - 호환을 위해 ContactInquiry 에도 가입 흔적을 남김(어드민 inbox 의존하던 기존 알림 유지).
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  // honeypot
  if (body.website) {
    return json({ success: true }, { status: 201 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const locale = body.locale === "en" ? "en" : "ko";
  const source =
    typeof body.source === "string" && body.source.length <= 64
      ? body.source
      : "home_community";

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "email" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return json({ error: "service_unavailable" }, { status: 503 });
  }

  const label = locale === "ko" ? "OOH 트렌드 리포트 뉴스레터" : "OOH Trend Newsletter";
  const message =
    locale === "ko"
      ? `[${source}] OOH 트렌드 리포트 뉴스레터 구독 신청`
      : `[${source}] OOH trend newsletter signup`;

  try {
    const db = getPrisma();
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {
        unsubscribedAt: null,
        locale,
        ...(source && { source }),
      },
      create: {
        email,
        locale,
        source,
      },
    });

    // 호환 — 기존 어드민 inbox(ContactInquiry) 흐름 유지
    try {
      await db.contactInquiry.create({
        data: {
          company: "",
          name: label,
          phone: "-",
          email,
          inquiryType: label,
          budget: null,
          message,
        },
      });
    } catch {
      // ContactInquiry 저장 실패는 구독 자체에는 영향 없음
    }
  } catch (err) {
    console.error("[newsletter]", err);
    return json({ error: "save_failed" }, { status: 500 });
  }

  void postInternalAlert({
    type: "newsletter_signup",
    title: "뉴스레터 구독",
    body: `${email} · ${label} (${source})`,
    meta: { email, source, locale },
  }).catch(() => {});

  return json({ success: true }, { status: 201 });
}

/**
 * DELETE /api/newsletter?email=... — 1-step 해지(어드민 패널·이메일 링크용).
 * 보안: 단순 토큰 없이 동작 — 이메일 입력만으로 해지하므로 운영 시 토큰 추가 검토.
 */
export async function DELETE(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return json({ error: "service_unavailable" }, { status: 503 });
  }
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "email" }, { status: 400 });
  }
  try {
    const db = getPrisma();
    await db.newsletterSubscriber.updateMany({
      where: { email },
      data: { unsubscribedAt: new Date() },
    });
    return json({ success: true });
  } catch (e) {
    console.error("[newsletter unsubscribe]", e);
    return json({ error: "save_failed" }, { status: 500 });
  }
}
