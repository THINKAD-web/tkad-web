import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
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
  const path = publicProofUploadPath(locale, row.token);
  const uploadUrl = `${base}${path}`;

  return json({
    token: row.token,
    uploadUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    usageCount: row.usageCount,
  });
}
