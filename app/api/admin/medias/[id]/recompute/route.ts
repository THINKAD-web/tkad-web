import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { recomputeOneMedia } from "@/lib/media/engine/recompute-one";
import { revalidateMediaCaches } from "@/lib/media-cache-revalidate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();

  try {
    const result = await recomputeOneMedia(db, id);
    // cpm/impressions aren't list-DTO gate fields (ranking/detail display
    // only) — detail path only. This call never passes markReviewed, so
    // reviewStatus can't change here.
    const media = await db.media.findUnique({
      where: { id },
      select: { slug: true },
    });
    revalidateMediaCaches(
      { id, slug: media?.slug },
      { invalidateList: false },
    );
    return json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Recompute failed";
    if (message.includes("not found")) {
      return json({ error: message }, 404);
    }
    console.error("[admin-api] media recompute failed", { id, err });
    return json({ error: message }, 500);
  }
}
