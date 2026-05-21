import { NextRequest } from "next/server";
import { academyDownloads } from "@/lib/academy-content";
import {
  getAcademyDownloadById,
  upsertAcademyDownloadAsset,
} from "@/lib/academy-download-assets";
import { buildExtendedAcademyPdfBuffer } from "@/lib/academy-pdf-extended";
import {
  isCloudinaryConfigured,
  uploadAcademyPdf,
} from "@/lib/cloudinary-upload-contract";
import { assertAdminDb, json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  assetId?: string;
  all?: boolean;
  useAi?: boolean;
};

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isCloudinaryConfigured()) {
    return json({ error: "Cloudinary not configured" }, 503);
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const ids = body.all
    ? academyDownloads.map((a) => a.id)
    : body.assetId
      ? [body.assetId]
      : [];

  if (!ids.length) {
    return json({ error: "Provide assetId or all: true" }, 400);
  }

  const results: Array<{
    assetId: string;
    ok: boolean;
    pdfUrl?: string;
    error?: string;
  }> = [];

  for (const assetId of ids) {
    const asset = getAcademyDownloadById(assetId);
    if (!asset) {
      results.push({ assetId, ok: false, error: "unknown asset" });
      continue;
    }

    try {
      const buffer = await buildExtendedAcademyPdfBuffer(asset);
      const { url, publicId } = await uploadAcademyPdf(buffer, asset.id);
      await upsertAcademyDownloadAsset({
        asset,
        pdfUrl: url,
        pdfPublicId: publicId,
      });
      results.push({ assetId, ok: true, pdfUrl: url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ assetId, ok: false, error: msg });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return json(
    {
      ok: okCount === results.length,
      generated: okCount,
      results,
    },
    okCount > 0 ? 200 : 500,
  );
}
