import { NextRequest } from "next/server";
import { resolveMediaForDetail } from "@/lib/public-media-catalog";
import { withApiKeyAuth, v1Error } from "@/lib/api-key-auth";
import { mediaItemToV1Detail } from "@/lib/api-v1-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return withApiKeyAuth(request, `/api/v1/media/${id}`, async () => {
    const media = await resolveMediaForDetail(id);
    if (!media) {
      return v1Error("NOT_FOUND", 404, "Media not found");
    }

    const data = mediaItemToV1Detail(media);
    if (!data) {
      return v1Error("NOT_FOUND", 404, "Media has no valid coordinates");
    }

    return Response.json({ data });
  });
}
