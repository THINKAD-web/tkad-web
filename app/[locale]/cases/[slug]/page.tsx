import { notFound } from "next/navigation";
import {
  getPublishedSuccessCaseById,
  getPublishedSuccessCases,
} from "@/lib/public-content-queries";
import CaseDetailClient from "./case-detail-client";

type Props = { params: Promise<{ slug: string }> };

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublishedSuccessCaseById(slug);
  if (!row) notFound();

  const ordered = await getPublishedSuccessCases();
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
