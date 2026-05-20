import { notFound } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  getPublishedSuccessCaseById,
  getPublishedSuccessCases,
} from "@/lib/public-content-queries";
import { serializeJsonLd } from "@/lib/seo";
import { buildSuccessCaseArticleJsonLd } from "@/lib/structured-data";
import { scoreSimilarCases } from "@/lib/success-case-hub";
import CaseDetailClient from "./case-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await resolveLocaleParam(params);
  const row = await getPublishedSuccessCaseById(slug, locale);
  if (!row) notFound();

  let ordered: Awaited<ReturnType<typeof getPublishedSuccessCases>> = [];
  try {
    ordered = await getPublishedSuccessCases(locale);
  } catch {
    ordered = [];
  }
  const idx = ordered.findIndex((c) => c.id === row.id);
  const prev =
    idx > 0
      ? {
          id: ordered[idx - 1].id,
          titleKo: ordered[idx - 1].titleKo,
          titleEn: ordered[idx - 1].titleEn,
        }
      : null;
  const next =
    idx >= 0 && idx < ordered.length - 1
      ? {
          id: ordered[idx + 1].id,
          titleKo: ordered[idx + 1].titleKo,
          titleEn: ordered[idx + 1].titleEn,
        }
      : null;

  const similar = scoreSimilarCases(row, ordered, 3);
  const articleLd = buildSuccessCaseArticleJsonLd(row, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }}
      />
      <CaseDetailClient
        row={row}
        prev={prev}
        next={next}
        similarCases={similar}
      />
    </>
  );
}
