import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { assertAdminDb } from "@/lib/admin-guard";
import {
  getOrCreateProofUploadToken,
  publicProofUploadPath,
} from "@/lib/campaign-proof-service";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;

  const row = await getOrCreateProofUploadToken(campaignId);
  const locale =
    request.nextUrl.searchParams.get("locale")?.trim() === "en" ? "en" : "ko";
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteUrl
  ).replace(/\/$/, "");
  const uploadUrl = `${base}${publicProofUploadPath(locale, row.token)}`;

  const png = await QRCode.toBuffer(uploadUrl, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="campaign-${campaignId}-proof-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
