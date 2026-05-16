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

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json(
      { error: "too_many_requests" },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.website) {
    return json({ success: true }, { status: 201 });
  }

  const email = String(body.email ?? "").trim();
  const locale = body.locale === "en" ? "en" : "ko";

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "email" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return json({ error: "service_unavailable" }, { status: 503 });
  }

  const label =
    locale === "ko" ? "OOH 업계 뉴스레터" : "OOH industry newsletter";
  const message =
    locale === "ko"
      ? "[홈 커뮤니티 섹션] OOH 업계 뉴스레터 구독 신청"
      : "[Home community section] OOH industry newsletter signup";

  try {
    const db = getPrisma();
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
  } catch (err) {
    console.error("[newsletter]", err);
    return json({ error: "save_failed" }, { status: 500 });
  }

  void postInternalAlert({
    type: "newsletter_signup",
    title: "뉴스레터 구독",
    body: `${email} · ${label}`,
    meta: { email, source: "home_community_section", locale },
  }).catch(() => {});

  return json({ success: true }, { status: 201 });
}
