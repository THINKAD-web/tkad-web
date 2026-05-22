import { NextRequest } from "next/server";
import { buildOperatorManualPdfBuffer } from "@/lib/build-operator-manual-pdf";
import {
  isCloudinaryConfigured,
  uploadOperatorManualPdf,
} from "@/lib/cloudinary-upload-contract";
import {
  getOperatorManualAsset,
  saveOperatorManualAsset,
} from "@/lib/operator-manual-store";
import { assertAdminDb, json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET — 최신 운영 매뉴얼 PDF 메타 */
export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const asset = await getOperatorManualAsset();
  return json({
    ok: true,
    pdfUrl: asset?.pdfUrl ?? null,
    generatedAt: asset?.generatedAt ?? null,
  });
}

/** POST — 운영 매뉴얼 PDF 생성 → Cloudinary 업로드 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isCloudinaryConfigured()) {
    return json({ error: "Cloudinary not configured" }, 503);
  }

  try {
    const buffer = await buildOperatorManualPdfBuffer();
    const { url, publicId } = await uploadOperatorManualPdf(buffer);
    const asset = await saveOperatorManualAsset({
      pdfUrl: url,
      pdfPublicId: publicId,
    });

    return json({
      ok: true,
      pdfUrl: asset.pdfUrl,
      generatedAt: asset.generatedAt,
    });
  } catch (e) {
    console.error("[admin-generate-manual]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}
