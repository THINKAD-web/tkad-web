import { MEDIA_PACKAGE_SEED_DATA } from "@/lib/media-package-seed-data";
import type { AcademyLesson } from "@/lib/academy-content";
import type { InsightReport } from "@/lib/insights-reports";
import { matchesMediaTextQuery, type MediaItem } from "@/lib/media-data";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  getPublishedAcademyLessonsForUi,
  getPublishedInsightReports,
  getPublishedSuccessCases,
} from "@/lib/public-content-queries";
import type { PublishedReportListRow } from "@/lib/report-queries";
import { listPublishedReports } from "@/lib/report-queries";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { matchesTextQuery, normalizeSearchQuery } from "@/lib/search-text";
import { typeLabels } from "@/lib/media-data";
import {
  flattenMediaCategories,
  TARGET_CATEGORIES,
} from "@/lib/media-categories";

export type SearchResultKind =
  | "media"
  | "package"
  | "case"
  | "report"
  | "academy"
  | "media_category"
  | "target_category"
  | "category_page";

export type UnifiedSearchHit = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type UnifiedSearchResults = {
  query: string;
  media: UnifiedSearchHit[];
  packages: UnifiedSearchHit[];
  cases: UnifiedSearchHit[];
  reports: UnifiedSearchHit[];
  academy: UnifiedSearchHit[];
  totalCount: number;
};

const DEFAULT_PER_SECTION = 3;

function packageHaystack(
  p: (typeof MEDIA_PACKAGE_SEED_DATA)[number],
): string {
  return [
    p.name,
    p.subtitle,
    p.description,
    p.badgeText ?? "",
    p.avgBudget ?? "",
    ...p.targetIndustry,
    ...p.filterRegion,
    ...p.filterCategory,
    ...p.filterTarget,
  ].join(" ");
}

function caseHaystack(c: PublicSuccessCaseListItem): string {
  return [
    c.clientName,
    c.industry,
    c.titleKo,
    c.titleEn ?? "",
    c.summaryKo,
    c.budgetRange ?? "",
    ...c.mediaUsed,
  ].join(" ");
}

function insightHaystack(r: InsightReport, isKo: boolean): string {
  return [
    r.titleKo,
    r.titleEn,
    r.labelKo,
    r.labelEn,
    ...(isKo ? r.summaryKo : r.summaryEn),
    ...(isKo ? r.marketTrendKo : r.marketTrendEn),
    r.slug ?? "",
  ].join(" ");
}

function reportHaystack(r: PublishedReportListRow): string {
  return [r.title, r.summary, r.category, r.slug].join(" ");
}

function academyHaystack(l: AcademyLesson, isKo: boolean): string {
  return [
    l.titleKo,
    l.titleEn,
    l.descKo,
    l.descEn,
    ...(isKo ? l.outlineKo : l.outlineEn),
  ].join(" ");
}

function searchMedia(
  catalog: MediaItem[],
  lower: string,
  limit: number,
  isKo: boolean,
): UnifiedSearchHit[] {
  return catalog
    .filter((m) => matchesMediaTextQuery(m, lower))
    .slice(0, limit)
    .map((m) => {
      const typeLabel = typeLabels[m.type];
      return {
        kind: "media" as const,
        id: m.id,
        title: isKo ? m.name : m.nameEn || m.name,
        subtitle: [
          isKo ? typeLabel?.ko : typeLabel?.en,
          m.district || m.region,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/media/${m.id}`,
      };
    });
}

function searchPackages(
  lower: string,
  limit: number,
  isKo: boolean,
): UnifiedSearchHit[] {
  return MEDIA_PACKAGE_SEED_DATA.filter((p) =>
    matchesTextQuery(packageHaystack(p), lower),
  )
    .slice(0, limit)
    .map((p) => ({
      kind: "package" as const,
      id: p.slug,
      title: p.name,
      subtitle: p.subtitle,
      href: `/media/packages/${encodeURIComponent(p.slug)}`,
    }));
}

function searchCases(
  cases: PublicSuccessCaseListItem[],
  lower: string,
  limit: number,
  isKo: boolean,
): UnifiedSearchHit[] {
  return cases
    .filter((c) => matchesTextQuery(caseHaystack(c), lower))
    .slice(0, limit)
    .map((c) => ({
      kind: "case" as const,
      id: c.id,
      title: isKo ? c.titleKo : c.titleEn || c.titleKo,
      subtitle: [c.clientName, c.industry].filter(Boolean).join(" · "),
      href: `/cases/${c.id}`,
    }));
}

function searchReports(
  reports: PublishedReportListRow[],
  insights: InsightReport[],
  lower: string,
  limit: number,
  isKo: boolean,
): UnifiedSearchHit[] {
  const hits: UnifiedSearchHit[] = [];

  for (const r of reports) {
    if (!matchesTextQuery(reportHaystack(r), lower)) continue;
    hits.push({
      kind: "report",
      id: r.id,
      title: r.title,
      subtitle: r.summary.slice(0, 80),
      href: `/report/${r.slug}`,
    });
    if (hits.length >= limit) return hits;
  }

  for (const r of insights) {
    if (!r.slug) continue;
    if (!matchesTextQuery(insightHaystack(r, isKo), lower)) continue;
    hits.push({
      kind: "report",
      id: r.id,
      title: isKo ? r.titleKo : r.titleEn,
      subtitle: (isKo ? r.summaryKo[0] : r.summaryEn[0]) ?? r.labelKo,
      href: `/report/${r.slug}`,
    });
    if (hits.length >= limit) return hits;
  }

  return hits;
}

function searchAcademy(
  lessons: AcademyLesson[],
  lower: string,
  limit: number,
  isKo: boolean,
): UnifiedSearchHit[] {
  return lessons
    .filter((l) => matchesTextQuery(academyHaystack(l, isKo), lower))
    .slice(0, limit)
    .map((l) => ({
      kind: "academy" as const,
      id: l.id,
      title: isKo ? l.titleKo : l.titleEn,
      subtitle: isKo ? l.descKo : l.descEn,
      href: "/academy",
    }));
}

export type RunUnifiedSearchOpts = {
  query: string;
  locale?: string;
  perSection?: number;
  mediaLimit?: number;
};

export async function runUnifiedSearch(
  opts: RunUnifiedSearchOpts,
): Promise<UnifiedSearchResults> {
  const query = normalizeSearchQuery(opts.query);
  const isKo = !opts.locale || opts.locale === "ko" || opts.locale.startsWith("ko");
  const per = opts.perSection ?? DEFAULT_PER_SECTION;
  const mediaLimit = opts.mediaLimit ?? per;

  if (!query) {
    return {
      query: "",
      media: [],
      packages: [],
      cases: [],
      reports: [],
      academy: [],
      totalCount: 0,
    };
  }

  const lower = query.toLowerCase();

  const [catalog, cases, reportList, insights, academy] = await Promise.all([
    fetchPublicMediaCatalog(),
    getPublishedSuccessCases(opts.locale ?? "ko"),
    listPublishedReports({ page: 1, pageSize: 100 }),
    getPublishedInsightReports(),
    getPublishedAcademyLessonsForUi(),
  ]);

  const media = searchMedia(catalog, lower, mediaLimit, isKo);
  const packages = searchPackages(lower, per, isKo);
  const caseHits = searchCases(cases, lower, per, isKo);
  const reports = searchReports(reportList.reports, insights, lower, per, isKo);
  const academyHits = searchAcademy(academy, lower, per, isKo);

  const totalCount =
    media.length +
    packages.length +
    caseHits.length +
    reports.length +
    academyHits.length;

  return {
    query,
    media,
    packages,
    cases: caseHits,
    reports,
    academy: academyHits,
    totalCount,
  };
}

/** 매체명·카테고리 자동완성 (상위 N개) */
export async function suggestMediaNames(
  query: string,
  limit = 5,
  locale = "ko",
): Promise<UnifiedSearchHit[]> {
  const q = normalizeSearchQuery(query);
  if (!q) return [];
  const catalog = await fetchPublicMediaCatalog();
  const isKo = locale === "ko" || locale.startsWith("ko");
  const lower = q.toLowerCase();

  const mediaHits = searchMedia(
    catalog,
    lower,
    Math.max(2, limit - 2),
    isKo,
  );

  const categoryHits: UnifiedSearchHit[] = [];
  for (const c of flattenMediaCategories()) {
    const label = isKo ? c.nameKo : c.nameEn;
    if (
      matchesTextQuery(label, q) ||
      c.slug.includes(lower) ||
      (c.seoKeywordsKo ?? []).some((k) => k.toLowerCase().includes(lower))
    ) {
      categoryHits.push({
        kind: "media_category",
        id: c.slug,
        title: `${c.icon ?? "🚇"} ${label}`,
        subtitle: isKo ? "매체 카테고리" : "Media category",
        href: `/media/category/${c.slug}`,
      });
    }
  }

  for (const t of TARGET_CATEGORIES) {
    const label = isKo ? t.nameKo : t.nameEn;
    if (
      matchesTextQuery(label, q) ||
      t.slug.includes(lower) ||
      (t.seoKeywordsKo ?? []).some((k) => k.toLowerCase().includes(lower))
    ) {
      categoryHits.push({
        kind: "target_category",
        id: t.slug,
        title: `${t.icon ?? "📢"} ${label}`,
        subtitle: isKo ? "캠페인 목적" : "Campaign goal",
        href: `/target/${t.slug}`,
      });
    }
  }

  if (lower.length >= 2) {
    categoryHits.push({
      kind: "category_page",
      id: `browse-${lower}`,
      title: isKo ? `${q} 매체 모아보기` : `Browse media: ${q}`,
      subtitle: isKo ? "카테고리 페이지" : "Category browse",
      href: `/media?q=${encodeURIComponent(q)}`,
    });
  }

  return [...categoryHits.slice(0, 3), ...mediaHits].slice(0, limit);
}
