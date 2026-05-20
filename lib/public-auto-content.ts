import prisma, { isDatabaseConfigured } from "@/lib/prisma";
import {
  isDatabaseAuthError,
  isDatabaseUnreachableError,
  isMissingContentTableError,
} from "@/lib/prisma-content-guards";

export type PublicEducationArticle = {
  id: string;
  slug: string;
  titleKo: string;
  titleEn: string | null;
  excerptKo: string;
  contentKo: string;
  metaDescription: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export type PublicGuideArticle = PublicEducationArticle;

async function safeQuery<T>(fn: () => Promise<T>): Promise<T | []> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await fn();
  } catch (e) {
    if (
      isMissingContentTableError(e) ||
      isDatabaseAuthError(e) ||
      isDatabaseUnreachableError(e)
    ) {
      return [];
    }
    throw e;
  }
}

export async function getPublishedEducationArticles(): Promise<
  PublicEducationArticle[]
> {
  const rows = await safeQuery(() =>
    prisma.educationArticle.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
  );
  return rows as PublicEducationArticle[];
}

export async function getPublishedEducationBySlug(
  slug: string,
): Promise<PublicEducationArticle | null> {
  const row = await safeQuery(() =>
    prisma.educationArticle.findFirst({
      where: { slug, status: "published" },
    }),
  );
  if (!row || Array.isArray(row)) return null;
  return row as PublicEducationArticle;
}

export async function getPublishedGuideArticles(): Promise<
  PublicGuideArticle[]
> {
  const rows = await safeQuery(() =>
    prisma.guideArticle.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
  );
  return rows as PublicGuideArticle[];
}

export async function getPublishedGuideBySlug(
  slug: string,
): Promise<PublicGuideArticle | null> {
  const row = await safeQuery(() =>
    prisma.guideArticle.findFirst({
      where: { slug, status: "published" },
    }),
  );
  if (!row || Array.isArray(row)) return null;
  return row as PublicGuideArticle;
}
