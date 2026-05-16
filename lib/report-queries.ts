import type { Prisma, ReportCategory } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  isDatabaseAuthError,
  isMissingContentTableError,
} from "@/lib/prisma-content-guards";
import { REPORT_CATEGORY_ORDER } from "@/lib/report-category";

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
};

const emptyListResult = (page: number, pageSize: number) => ({
  reports: [] as PublishedReportListRow[],
  total: 0,
  page,
  pageSize,
});

export async function listPublishedReports(opts: {
  category?: ReportCategory | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  reports: PublishedReportListRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);
  if (!isDatabaseConfigured()) {
    return emptyListResult(page, pageSize);
  }

  const where: Prisma.ReportWhereInput = {
    published: true,
    ...(opts.category ? { category: opts.category } : {}),
  };

  try {
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
          category: true,
          thumbnail: true,
          publishedAt: true,
        },
      }),
    ]);

    return { reports: rows, total, page, pageSize };
  } catch (e) {
    if (isMissingContentTableError(e) || isDatabaseAuthError(e)) {
      return emptyListResult(page, pageSize);
    }
    throw e;
  }
}

export async function getPublishedReportBySlug(slug: string) {
  if (!isDatabaseConfigured()) return null;
  try {
    const db = getPrisma();
    return await db.report.findFirst({
      where: { slug, published: true },
    });
  } catch (e) {
    if (isMissingContentTableError(e) || isDatabaseAuthError(e)) return null;
    throw e;
  }
}
