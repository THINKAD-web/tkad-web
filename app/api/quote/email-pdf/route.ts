import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmailWithPdfAttachment } from "@/lib/email/client";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PDF_BYTES = 2_800_000;

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

  const email = String(body.email ?? "").trim();
  const pdfBase64 = String(body.pdfBase64 ?? "").trim();
  const isKo = body.locale === "ko";

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "Invalid email" }, { status: 400 });
  }

  if (!pdfBase64 || pdfBase64.length < 100) {
    return json({ error: "Invalid PDF payload" }, { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(pdfBase64, "base64");
  } catch {
    return json({ error: "Invalid PDF encoding" }, { status: 400 });
  }

  if (buf.length > MAX_PDF_BYTES) {
    return json({ error: "PDF too large" }, { status: 400 });
  }

  if (buf.slice(0, 5).toString() !== "%PDF-") {
    return json({ error: "Invalid PDF file" }, { status: 400 });
  }

  try {
    await sendEmailWithPdfAttachment({
      to: email,
      subject: isKo
        ? "[싱커드] 요청하신 견적 PDF입니다"
        : "[THINKAD] Your quote PDF",
      text: isKo
        ? "첨부된 PDF는 싱커드 견적 마법사에서 만든 참고 견적입니다."
        : "Attached is the reference quote generated from the THINKAD quote wizard.",
      html: isKo
        ? "<p>첨부된 PDF는 싱커드 견적 마법사에서 만든 참고 견적입니다.</p>"
        : "<p>Attached is the reference quote from the THINKAD quote wizard.</p>",
      pdfFilename: "thinkad-quote.pdf",
      pdfBase64,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Email not configured") {
      return json(
        {
          error: "Email unavailable",
          code: "EMAIL_DISABLED",
        },
        { status: 503 },
      );
    }
    console.error("[quote/email-pdf]", e);
    return json({ error: "Failed to send email" }, { status: 500 });
  }

  return json({ success: true }, { status: 201 });
}
