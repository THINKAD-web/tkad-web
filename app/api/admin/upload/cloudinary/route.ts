import { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import { signUploadParams, isCloudinaryConfigured } from "@/lib/cloudinary-sign";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  if (!isCloudinaryConfigured()) {
    return json({ error: "Cloudinary not configured" }, 503);
  }

  const params = signUploadParams();
  if (!params) return json({ error: "Cloudinary sign failed" }, 503);
  return json(params);
}
