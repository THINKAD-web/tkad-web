import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 8, windowMs: 60_000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SOURCE_LABELS: Record<string, { ko: string; en: string }> = {
  report: { ko: "트렌드 리포트", en: "Trend reports" },
  academy: { ko: "아카데미", en: "Academy" },
};

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
    return json({ error: "rate_limited" }, { status: 429 });
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
  const source = String(body.source ?? "").trim();
  const locale = body.locale === "en" ? "en" : "ko";

  if (!EMAIL_RE.test(email)) {
    return json({ error: "validation_failed", fields: ["email"] }, { status: 400 });
  }

  if (!SOURCE_LABELS[source]) {
    return json({ error: "validation_failed", fields: ["source"] }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return json({ error: "service_unavailable" }, { status: 503 });
  }

  const label = SOURCE_LABELS[source][locale];
  const message = `[콘텐츠 알림 신청] ${label} — ${email}`;

  try {
    const db = getPrisma();
    await db.contactInquiry.create({
      data: {
        company: "",
        name: locale === "ko" ? "콘텐츠 알림" : "Content notify",
        phone: "-",
        email,
        message,
        inquiryType: locale === "ko" ? "콘텐츠 알림" : "Content notify",
        budget: "-",
      },
    });
  } catch (err) {
    console.error("[content-notify] DB error:", err);
    return json({ error: "save_failed" }, { status: 500 });
  }

  return json({ success: true }, { status: 201 });
}
