import type { Prisma, ReportCategory } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { REPORT_CATEGORY_ORDER } from "@/lib/report-category";
import {
  getDemoReportBySlug,
  listDemoReports,
} from "@/lib/report-demo-data";
import { estimateReportReadMinutes } from "@/lib/report-markdown";

export function parseReportCategoryParam(
  raw: string | null | undefined,
): ReportCategory | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  return REPORT_CATEGORY_ORDER.includes(v as ReportCategory)
    ? (v as ReportCategory)
    : null;
}

export type PublishedReportListRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: ReportCategory;
  thumbnail: string | null;
  publishedAt: Date | null;
  tags: string[];
  readMinutes: number;
};

function mapListRow(
  r: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    category: ReportCategory;
    thumbnail: string | null;
    publishedAt: Date | null;
    tags: string[];
    content?: string;
  },
): PublishedReportListRow {
  const body = r.content?.trim() ? r.content : r.summary;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    category: r.category,
    thumbnail: r.thumbnail,
    publishedAt: r.publishedAt,
    tags: r.tags,
    readMinutes: estimateReportReadMinutes(body),
  };
}

export async function listPublishedReports(opts: {
  category?: ReportCategory | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  reports: PublishedReportListRow[];
  total: number;
  page: number;
  pageSize: number;
  usingDemo: boolean;
}> {
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);

  if (!isDatabaseConfigured()) {
    const demo = listDemoReports({ ...opts, page, pageSize });
    return {
      reports: demo.reports.map((r) => mapListRow(r)),
      total: demo.total,
      page: demo.page,
      pageSize: demo.pageSize,
      usingDemo: true,
    };
  }

  const where: Prisma.ReportWhereInput = {
    published: true,
    ...(opts.category ? { category: opts.category } : {}),
  };

  const db = getPrisma();
  const [total, rows] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        thumbnail: true,
        publishedAt: true,
        tags: true,
      },
    }),
  ]);

  if (total === 0 && page === 1) {
    const demo = listDemoReports({ ...opts, page, pageSize });
    return {
      reports: demo.reports.map((r) => mapListRow(r)),
      total: demo.total,
      page: demo.page,
      pageSize: demo.pageSize,
      usingDemo: true,
    };
  }

  return {
    reports: rows.map((r) => mapListRow(r)),
    total,
    page,
    pageSize,
    usingDemo: false,
  };
}

export async function getPublishedReportBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return getDemoReportBySlug(slug);
  }
  const db = getPrisma();
  const row = await db.report.findFirst({
    where: { slug, published: true },
  });
  if (row) return row;
  return getDemoReportBySlug(slug);
}
