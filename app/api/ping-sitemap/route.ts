import { NextRequest, NextResponse } from "next/server";
import {
  pingSearchEngineSitemaps,
  publicSitemapUrl,
  type SitemapPingTarget,
} from "@/lib/sitemap-ping";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function parseTargets(raw: string | null): SitemapPingTarget[] | undefined {
  if (!raw?.trim()) return undefined;
  const allowed = new Set<SitemapPingTarget>(["google", "naver"]);
  const picked = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is SitemapPingTarget => allowed.has(s as SitemapPingTarget));
  return picked.length > 0 ? picked : undefined;
}

/**
 * Sitemap ping — Google·네이버 서치어드바이저에 sitemap URL 제출.
 *
 * - Vercel Cron: `Authorization: Bearer $CRON_SECRET` (vercel.json)
 * - 수동: `curl -H "Authorization: Bearer $CRON_SECRET" https://tkad.co.kr/api/ping-sitemap`
 * - 선택: `?targets=google,naver`
 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.SITEMAP_PING_DISABLED === "1") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "SITEMAP_PING_DISABLED",
      sitemap: publicSitemapUrl(),
    });
  }

  const targets = parseTargets(request.nextUrl.searchParams.get("targets"));
  const results = await pingSearchEngineSitemaps(targets);
  const allOk = results.every((r) => r.ok);

  return NextResponse.json(
    {
      ok: allOk,
      sitemap: publicSitemapUrl(),
      results,
      at: new Date().toISOString(),
    },
    { status: allOk ? 200 : 207 },
  );
}
