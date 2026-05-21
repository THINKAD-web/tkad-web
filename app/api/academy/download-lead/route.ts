import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { academyDownloads } from "@/lib/academy-content";
import { listAcademyDownloadAssetUrls } from "@/lib/academy-download-assets";
import { rateLimit } from "@/lib/rate-limit";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 8, windowMs: 60_000 });

const Body = z.object({
  assetId: z.string().min(2).max(40),
  email: z.string().email().max(200),
  locale: z.string().max(8).optional(),
  website: z.string().max(0).optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

/** PDF 다운로드 전 이메일 리드 수집 → Cloudinary URL 반환 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(`academy-dl:${ip}`)) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "validation_failed" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) return json({ ok: true, pdfUrl: null });

  const asset = academyDownloads.find((a) => a.id === d.assetId);
  if (!asset) {
    return json({ error: "unknown_asset" }, { status: 404 });
  }

  const email = d.email.trim().toLowerCase();
  const isKo = (d.locale ?? "ko").startsWith("ko");

  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      await db.contactInquiry.create({
        data: {
          company: "",
          name: isKo ? "아카데미 PDF" : "Academy PDF",
          phone: "—",
          email,
          message: isKo
            ? `[아카데미 PDF] ${asset.titleKo}\nassetId: ${d.assetId}`
            : `[Academy PDF] ${asset.titleEn}\nassetId: ${d.assetId}`,
          inquiryType: isKo ? "아카데미 자료" : "Academy download",
          budget: "—",
        },
      });
    } catch (e) {
      if (!isMissingContentTableError(e)) {
        console.error("[academy/download-lead]", e);
      }
    }
  }

  const urls = await listAcademyDownloadAssetUrls();
  const pdfUrl = urls[d.assetId] ?? null;

  return json({ ok: true, pdfUrl, assetId: d.assetId }, { status: 200 });
}
