import { apiOk } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { listOwnerMedia } from "@/lib/media-owner-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const media = await listOwnerMedia(auth.user.id);
  return apiOk({ media });
}
