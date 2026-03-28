import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCaseStudyBySlug } from "@/lib/case-studies";
import { caseStudyOpenGraphImages, pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: loc, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: loc }));
  const cs = getCaseStudyBySlug(slug);
  if (!cs) {
    return { title: "Case study" };
  }
  const isKo = locale === "ko";
  const title = isKo ? cs.title : cs.titleEn;
  const description = isKo ? cs.description : cs.descriptionEn;
  const ogTitle = `${title} | THINKAD`;
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/cases/${slug}`),
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
