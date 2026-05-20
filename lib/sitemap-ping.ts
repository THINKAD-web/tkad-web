import { siteUrl } from "@/lib/seo";

export type SitemapPingTarget = "google" | "naver";

export type SitemapPingResult = {
  target: SitemapPingTarget;
  url: string;
  ok: boolean;
  status: number;
  body?: string;
  error?: string;
};

/** 공개 sitemap 절대 URL (SITE_URL / NEXT_PUBLIC_SITE_URL 기준) */
export function publicSitemapUrl(): string {
  return `${siteUrl.replace(/\/$/, "")}/sitemap.xml`;
}

const PING_ENDPOINTS: Record<SitemapPingTarget, (sitemap: string) => string> = {
  google: (sitemap) =>
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  naver: (sitemap) =>
    `https://searchadvisor.naver.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
};

/**
 * Google·네이버에 sitemap URL을 ping 합니다.
 * 검색엔진이 즉시 크롤하지 않을 수 있으며, ping 은 “제출 요청”에 가깝습니다.
 */
export async function pingSearchEngineSitemaps(
  targets: SitemapPingTarget[] = ["google", "naver"],
): Promise<SitemapPingResult[]> {
  const sitemap = publicSitemapUrl();
  const results: SitemapPingResult[] = [];

  for (const target of targets) {
    const url = PING_ENDPOINTS[target](sitemap);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "THINKAD-sitemap-ping/1.0" },
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.text()).slice(0, 500);
      results.push({
        target,
        url,
        ok: res.ok,
        status: res.status,
        body: body || undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        target,
        url,
        ok: false,
        status: 0,
        error: msg,
      });
    }
  }

  return results;
}
