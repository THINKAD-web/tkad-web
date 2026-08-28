import { routing } from "@/i18n/routing";
import { INDUSTRY_SLUGS } from "@/lib/industry-landing";
import { listGuideMeta } from "@/lib/guides-data";
import { BLOG_SEO_POSTS } from "@/lib/blog-seo-posts";
import { LOCAL_SEO_LANDINGS, localSeoPath } from "@/lib/local-seo-landings";
import { MARKETING_MEDIA_TYPE_SLUGS } from "@/lib/marketing-media-types";
import { PUBLIC_NAV_GROUPS } from "@/lib/navigation/public-nav-data";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import { getPublishedInsightReports } from "@/lib/public-content-queries";
import { sitemapPaths } from "@/lib/seo";

export type LinkProbeRow = {
  path: string;
  url: string;
  status: number | null;
  finalUrl: string | null;
  ok: boolean;
  error: string | null;
  redirected: boolean;
};

export type LinkHealthResult = {
  baseUrl: string;
  scanned: number;
  okCount: number;
  broken: LinkProbeRow[];
  redirected: LinkProbeRow[];
  checkedAt: string;
};

const FETCH_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 10;

function normalizeBase(base: string): string {
  return base.replace(/\/$/, "");
}

/** 수집할 내부 경로 (locale prefix 없음). */
export async function collectInternalPaths(opts?: {
  mediaLimit?: number;
}): Promise<string[]> {
  const paths = new Set<string>();

  for (const p of sitemapPaths) {
    paths.add(p || "/");
  }

  for (const g of PUBLIC_NAV_GROUPS) {
    for (const item of g.items) {
      paths.add(item.href);
    }
  }

  paths.add("/media/map");
  paths.add("/creatives/playlists");
  paths.add("/insights/market");
  paths.add("/login");
  paths.add("/join");
  paths.add("/my");
  paths.add("/cart");
  paths.add("/dashboard");

  for (const slug of INDUSTRY_SLUGS) {
    paths.add(`/industry/${slug}`);
  }
  for (const slug of MARKETING_MEDIA_TYPE_SLUGS) {
    paths.add(`/media/type/${slug}`);
  }
  for (const landing of LOCAL_SEO_LANDINGS.slice(0, 12)) {
    paths.add(localSeoPath(landing));
  }
  for (const g of listGuideMeta()) {
    paths.add(`/guides/${g.slug}`);
  }
  for (const post of BLOG_SEO_POSTS) {
    paths.add(`/blog/${post.slug}`);
  }

  try {
    const cases = await getPublishedSuccessCases();
    for (const c of cases.slice(0, 30)) {
      paths.add(`/cases/${c.id}`);
    }
  } catch {
    /* ignore */
  }

  try {
    const catalog = await fetchPublicMediaCatalogList();
    const limit = opts?.mediaLimit ?? 40;
    for (const m of catalog.slice(0, limit)) {
      paths.add(`/media/${m.id}`);
    }
    const regions = new Set(catalog.map((m) => m.region).filter(Boolean));
    for (const r of regions) {
      paths.add(`/media/region/${r}`);
    }
  } catch {
    /* ignore */
  }

  try {
    const reports = await getPublishedInsightReports();
    for (const r of reports.slice(0, 20)) {
      if (r.slug) paths.add(`/report/${r.slug}`);
      paths.add(`/insights/${r.slug}`);
    }
  } catch {
    /* ignore */
  }

  return [...paths].sort();
}

export function buildLocaleUrls(
  baseUrl: string,
  paths: string[],
  locale = "ko",
): { path: string; url: string }[] {
  const base = normalizeBase(baseUrl);
  const prefix = `/${locale}`;
  return paths.map((path) => {
    const suffix = path === "/" ? "" : path;
    return { path: suffix || "/", url: `${base}${prefix}${suffix}` };
  });
}

async function probeUrl(url: string): Promise<{
  status: number | null;
  finalUrl: string | null;
  ok: boolean;
  error: string | null;
  redirected: boolean;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent": "THINKAD-LinkHealth/1.0",
      },
    });
    const redirected = res.url !== url;
    const ok = res.status >= 200 && res.status < 400;
    return {
      status: res.status,
      finalUrl: res.url,
      ok,
      error: ok ? null : `HTTP ${res.status}`,
      redirected,
    };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.name === "AbortError"
          ? "timeout"
          : e.message
        : String(e);
    return {
      status: null,
      finalUrl: null,
      ok: false,
      error: msg,
      redirected: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function scanInternalLinks(opts?: {
  baseUrl?: string;
  locale?: string;
  mediaLimit?: number;
}): Promise<LinkHealthResult> {
  const baseUrl = normalizeBase(
    opts?.baseUrl?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
        : "https://tkad-web.vercel.app"),
  );
  const locale = opts?.locale ?? routing.defaultLocale;
  const paths = await collectInternalPaths({ mediaLimit: opts?.mediaLimit });
  const urls = buildLocaleUrls(baseUrl, paths, locale);

  const rows: LinkProbeRow[] = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const probed = await Promise.all(
      batch.map(async ({ path, url }) => {
        const r = await probeUrl(url);
        return {
          path,
          url,
          status: r.status,
          finalUrl: r.finalUrl,
          ok: r.ok,
          error: r.error,
          redirected: r.redirected,
        };
      }),
    );
    rows.push(...probed);
  }

  const broken = rows.filter((r) => !r.ok);
  const redirected = rows.filter(
    (r) => r.ok && r.redirected && r.finalUrl && !r.finalUrl.includes(r.path),
  );

  return {
    baseUrl,
    scanned: rows.length,
    okCount: rows.filter((r) => r.ok).length,
    broken,
    redirected,
    checkedAt: new Date().toISOString(),
  };
}
