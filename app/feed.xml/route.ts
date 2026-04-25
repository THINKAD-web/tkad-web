import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * RSS 2.0 피드 — 최근 50개 published 트렌드 리포트 (slug 있는 것만).
 * Feedly 등 표준 리더 호환.
 *
 * 인사이트 외 콘텐츠는 미포함 (사례/아카데미는 별도 피드 가능 — 후속 사이클).
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rssDate(d: Date): string {
  // RFC 822 형식
  return d.toUTCString();
}

export async function GET() {
  const channelTitle = "THINKAD OOH 인사이트";
  const channelDesc = "AI 가 매주 분석하는 옥외광고 시장 동향과 케이스 스터디.";
  const channelLink = `${siteUrl}/ko/insights`;
  const feedUrl = `${siteUrl}/feed.xml`;

  let items = "";
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const rows = await db.trendReport.findMany({
        where: { status: "published", slug: { not: null } },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: 50,
      });
      items = rows
        .map((r) => {
          const url = `${siteUrl}/ko/insights/${r.slug}`;
          const pubDate = r.publishedAt
            ? rssDate(r.publishedAt)
            : rssDate(r.updatedAt);
          const desc =
            r.summaryKo[0]?.slice(0, 600) ?? r.titleKo;
          return `<item>
  <title>${escapeXml(r.titleKo)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${pubDate}</pubDate>
  <description>${escapeXml(desc)}</description>
</item>`;
        })
        .join("\n");
    } catch (e) {
      console.error(
        "[feed.xml] DB query failed:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${channelLink}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>ko</language>
    <lastBuildDate>${rssDate(new Date())}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
