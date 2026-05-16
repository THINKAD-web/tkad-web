import { notFound } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  getPublishedSuccessCaseById,
  getPublishedSuccessCases,
} from "@/lib/public-content-queries";
import CaseDetailClient from "./case-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await resolveLocaleParam(params);
  const row = await getPublishedSuccessCaseById(slug, locale);
  if (!row) notFound();

  const ordered = await getPublishedSuccessCases(locale);
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

  return <CaseDetailClient row={row} prev={prev} next={next} />;
}
