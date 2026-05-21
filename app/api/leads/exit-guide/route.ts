import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { touchVisitorJourney } from "@/lib/visitor-journey";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { siteUrl } from "@/lib/seo";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const limiter = rateLimit({ limit: 6, windowMs: 60_000 });

const Body = z.object({
  email: z.string().email().max(200),
  locale: z.string().max(8).optional(),
  sessionId: z.string().min(8).max(64).optional(),
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

  if (!limiter.check(`exit-guide:${ip}`)) {
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

  const email = d.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const isKo = (d.locale ?? "ko").startsWith("ko");
  const origin = siteUrl;
  const guideUrl = `${origin}/${isKo ? "ko" : "en"}/guides`;

  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      await db.contactInquiry.create({
        data: {
          company: "",
          name: isKo ? "가이드 다운로드" : "Guide download",
          phone: "—",
          email,
          message: isKo
            ? `[이탈 방지] OOH 매체 가이드 요청\n이메일: ${email}`
            : `[Exit intent] OOH media guide request\nEmail: ${email}`,
          inquiryType: isKo ? "OOH 가이드 (이탈)" : "OOH guide (exit)",
          budget: "—",
        },
      });
    } catch (e) {
      console.error("[exit-guide] inquiry save:", e);
    }
  }

  if (d.sessionId) {
    void touchVisitorJourney({
      sessionId: d.sessionId,
      step: "guide_download",
      mark: "guide_downloaded",
      metadata: { email },
    });
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "OOH 가이드 리드 (이탈)",
    body: email,
    meta: { source: "exit_guide", email },
  }).catch(() => {});

  if (isEmailConfigured()) {
    try {
      const subject = isKo
        ? "[싱커드] 무료 OOH 매체 가이드"
        : "[Synced] Free OOH media guide";
      const text = isKo
        ? `안녕하세요.\n\n요청하신 OOH 매체 가이드를 보내 드립니다.\n\n가이드 보기: ${guideUrl}\n\n예산·지역에 맞는 매체 추천은 홈에서 바로 확인하실 수 있습니다.\n${origin}/ko\n\n감사합니다.\nTKAD 팀`
        : `Hello,\n\nHere is your OOH media guide:\n\n${guideUrl}\n\nTry budget-based recommendations on our home page.\n${origin}/en\n\n— TKAD`;
      const html = `<p>${isKo ? "안녕하세요." : "Hello,"}</p><p>${isKo ? "요청하신 <strong>OOH 매체 가이드</strong> 링크입니다." : "Your <strong>OOH media guide</strong> link:"}</p><p><a href="${guideUrl}">${guideUrl}</a></p><p><a href="${origin}/${isKo ? "ko" : "en"}">${isKo ? "매체 추천 받기" : "Get recommendations"}</a></p>`;
      await sendEmail({ to: email, subject, text, html });
    } catch (e) {
      console.error("[exit-guide] send email:", e);
      return json({ ok: false, error: "email_failed" }, { status: 500 });
    }
  }

  return json({ ok: true, guideUrl });
}
