import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublishedSuccessCaseById } from "@/lib/public-content-queries";
import { caseStudyOpenGraphImages, pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: loc, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: loc }));
  const row = await getPublishedSuccessCaseById(slug);
  if (!row) {
    return { title: "Case study" };
  }
  const isKo = locale === "ko";
  const title = isKo ? row.titleKo : row.titleEn ?? row.titleKo;
  const description = isKo
    ? row.summaryKo
    : `${title} is a THINKAD case study covering campaign execution, media strategy, and measurable OOH outcomes.`;
  const ogTitle = `${title} | THINKAD`;
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/cases/${slug}`),
    robots: isKo ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      type: "article",
      images: caseStudyOpenGraphImages(locale, slug, {
        ko: `${title} — THINKAD OOH 케이스 스터디`,
        en: `${title} — THINKAD OOH case study`,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: caseStudyOpenGraphImages(locale, slug, {
        ko: `${title} — THINKAD OOH 케이스 스터디`,
        en: `${title} — THINKAD OOH case study`,
      }),
    },
  };
}

export default function CaseSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
