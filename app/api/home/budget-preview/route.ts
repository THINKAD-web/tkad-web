import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  previewHomeBudgetMedia,
  type HomeBudgetIndustry,
  type HomeBudgetRegion,
} from "@/lib/home-budget-recommend";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { touchVisitorJourney } from "@/lib/visitor-journey";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 40, windowMs: 60_000 });

const Body = z.object({
  budgetMan: z.number().int().min(100).max(5000),
  region: z.enum(["gangnam", "hongdae", "seongsu", "national"]),
  industry: z
    .enum(["", "beauty", "fnb", "tech", "finance", "entertainment", "other"])
    .optional(),
  sessionId: z.string().min(8).max(64).optional(),
  locale: z.string().max(8).optional(),
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

  if (!limiter.check(ip)) {
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
    return json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { budgetMan, region, industry = "", sessionId, locale } = parsed.data;
  const isKo = (locale ?? "ko").startsWith("ko");

  try {
    const catalog = await fetchPublicMediaCatalogList();
    const scored = previewHomeBudgetMedia(
      catalog,
      budgetMan,
      region,
      industry as HomeBudgetIndustry,
      3,
    );

    if (sessionId) {
      void touchVisitorJourney({
        sessionId,
        step: "budget_preview",
        path: "/",
        mark: "budget_preview",
        metadata: { budgetMan, region, industry, count: scored.length },
      });
    }

    const items = scored.map((s) => {
      const m = s.item;
      return {
        id: m.id,
        name: isKo ? m.name : m.nameEn || m.name,
        location: isKo ? m.location : m.locationEn || m.location,
        price: m.price,
        score: s.score,
        imageUrl: getPrimaryMediaImageUrl(m),
        href: `/media/${m.id}`,
      };
    });

    return json({ ok: true, items });
  } catch (e) {
    console.error("[home/budget-preview]", e);
    return json({ ok: false }, { status: 500 });
  }
}
