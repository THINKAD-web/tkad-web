import {
  academyDownloads,
  type AcademyDownload,
} from "@/lib/academy-content";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

export type AcademyDownloadAssetRecord = {
  id: string;
  pdfUrl: string | null;
};

export function getAcademyDownloadById(id: string): AcademyDownload | undefined {
  return academyDownloads.find((d) => d.id === id);
}

export async function listAcademyDownloadAssetUrls(): Promise<
  Record<string, string>
> {
  const out: Record<string, string> = {};
  if (!isDatabaseConfigured()) return out;

  try {
    const db = getPrisma();
    const rows = await db.academyDownloadAsset.findMany({
      where: { pdfUrl: { not: null } },
      select: { id: true, pdfUrl: true },
    });
    for (const row of rows) {
      if (row.pdfUrl) out[row.id] = row.pdfUrl;
    }
  } catch (e) {
    if (!isMissingContentTableError(e)) throw e;
  }
  return out;
}

export async function upsertAcademyDownloadAsset(opts: {
  asset: AcademyDownload;
  pdfUrl: string;
  pdfPublicId: string;
}): Promise<void> {
  const db = getPrisma();
  await db.academyDownloadAsset.upsert({
    where: { id: opts.asset.id },
    create: {
      id: opts.asset.id,
      kind: opts.asset.kind,
      titleKo: opts.asset.titleKo,
      titleEn: opts.asset.titleEn,
      pdfUrl: opts.pdfUrl,
      pdfPublicId: opts.pdfPublicId,
      generatedAt: new Date(),
    },
    update: {
      pdfUrl: opts.pdfUrl,
      pdfPublicId: opts.pdfPublicId,
      generatedAt: new Date(),
    },
  });
}
