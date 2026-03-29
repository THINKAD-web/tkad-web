import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { autoLinkQuoteRequestToCampaign } from "@/lib/quote-campaign-link";
import { rateLimit } from "@/lib/rate-limit";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

const PHONE_RE = /^[\d\-+() ]{8,}$/;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function parseOptionalInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
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

  const {
    company,
    name,
    phone,
    email,
    mediaIds,
    period,
    budgetMin,
    budgetMax,
    estimatedCost,
    message,
  } = body as Record<string, unknown>;

  const ids = Array.isArray(mediaIds)
    ? mediaIds.filter((id): id is number => typeof id === "number")
    : [];

  const errors: string[] = [];
  if (!String(name ?? "").trim()) errors.push("name");
  if (!String(phone ?? "").trim() || !PHONE_RE.test(String(phone ?? ""))) {
    errors.push("phone");
  }
  if (ids.length < 1) errors.push("mediaIds");

  if (errors.length > 0) {
    return json(
      { error: "Validation failed", fields: errors },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  const budgetMinN = parseOptionalInt(budgetMin);
  const budgetMaxN = parseOptionalInt(budgetMax);
  const estimatedN = parseOptionalInt(estimatedCost);

  try {
    const db = getPrisma();
    const emailNorm = String(email ?? "").trim() || null;
    const created = await db.quoteRequest.create({
      data: {
        company: String(company ?? "").trim(),
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: emailNorm,
        mediaIds: JSON.stringify(ids),
        period: period != null ? String(period) : null,
        budgetMin: budgetMinN,
        budgetMax: budgetMaxN,
        estimatedCost: estimatedN,
        message: String(message ?? "").trim() || null,
      },
    });
    void postInternalAlert({
      type: "quote_request",
      title: "새 견적 요청",
      body: `${String(company ?? "").trim() || "-"} / ${String(name).trim()} · 매체 ${ids.length}건`,
      meta: { email: emailNorm, mediaCount: ids.length },
    }).catch(() => {});
    await autoLinkQuoteRequestToCampaign(db, created.id, emailNorm);
  } catch (err) {
    console.error("[quote] DB error:", err);
    return json({ error: "Failed to save quote request" }, { status: 500 });
  }

  return json({ success: true }, { status: 201 });
}
