import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  isSmtpConfigured,
  sendEmailWithResult,
} from "@/lib/email/client";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 20, windowMs: 60_000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Kind = "auto_reply" | "feedback_request";

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
    return json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.website) {
    return json({ ok: true }, { status: 201 });
  }

  const kind = body.kind as Kind;
  const to = String(body.to ?? "").trim();
  const company = String(body.company ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const campaignName = String(body.campaignName ?? "").trim();
  const locale = body.locale === "en" ? "en" : "ko";

  if (kind !== "auto_reply" && kind !== "feedback_request") {
    return json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!to || !EMAIL_RE.test(to) || !company) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!isSmtpConfigured()) {
    return json(
      {
        ok: true,
        sent: false,
        code: "SMTP_DISABLED" as const,
      },
      { status: 200 },
    );
  }

  const base = siteUrl;
  const contactLink = `${base}/${locale}/contact`;

  if (kind === "auto_reply") {
    const subject =
      locale === "ko"
        ? `[THINKAD] ${company} 님, 문의가 접수되었습니다`
        : `[THINKAD] We received your inquiry — ${company}`;
    const greeting =
      locale === "ko"
        ? `${contactName || "고객"}님, 안녕하세요. THINKAD입니다.`
        : `Hello${contactName ? ` ${contactName}` : ""}, this is THINKAD.`;
    const text =
      locale === "ko"
        ? `${greeting}\n\n문의해 주셔서 감사합니다. 담당자가 영업일 기준 1~2일 내 연락드리겠습니다.\n\n${contactLink}`
        : `${greeting}\n\nThank you for reaching out. Our team will contact you within 1–2 business days.\n\n${contactLink}`;
    const html =
      locale === "ko"
        ? `<p>${greeting}</p><p>문의해 주셔서 감사합니다. 담당자가 영업일 기준 1~2일 내 연락드리겠습니다.</p><p><a href="${contactLink}">${contactLink}</a></p>`
        : `<p>${greeting}</p><p>Thank you for reaching out. We will get back to you within 1–2 business days.</p><p><a href="${contactLink}">${contactLink}</a></p>`;

    const { sent } = await sendEmailWithResult({ to, subject, text, html });
    return json({ ok: true, sent }, { status: sent ? 200 : 502 });
  }

  const subject =
    locale === "ko"
      ? `[THINKAD] 캠페인 피드백을 부탁드립니다 — ${company}`
      : `[THINKAD] We’d love your campaign feedback — ${company}`;
  const camp =
    campaignName ||
    (locale === "ko" ? "진행하신 캠페인" : "your recent campaign");
  const text =
    locale === "ko"
      ? `${contactName || "고객"}님, 안녕하세요.\n\n${camp}이(가) 종료되어 짧은 피드백을 요청드립니다. 아래 페이지에서 설문에 참여해 주시면 감사하겠습니다.\n\n${contactLink}\n\nTHINKAD 드림`
      : `Hello${contactName ? ` ${contactName}` : ""},\n\nYour campaign (${camp}) has ended. We would appreciate a moment of your time for a short survey:\n\n${contactLink}\n\n— THINKAD`;
  const html =
    locale === "ko"
      ? `<p>${contactName || "고객"}님, 안녕하세요.</p><p>${camp}이(가) 종료되어 짧은 피드백을 부탁드립니다. <a href="${contactLink}">문의·피드백 페이지</a>에서 설문에 참여해 주세요.</p><p>THINKAD 드림</p>`
      : `<p>Hello${contactName ? ` ${contactName}` : ""},</p><p>Your campaign has ended. Please share quick feedback on our <a href="${contactLink}">contact page</a>.</p><p>— THINKAD</p>`;

  const { sent } = await sendEmailWithResult({ to, subject, text, html });
  return json({ ok: true, sent }, { status: sent ? 200 : 502 });
}
