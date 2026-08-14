import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { recomputeOneMedia } from "@/lib/media/engine/recompute-one";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();

  try {
    const result = await recomputeOneMedia(db, id);
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
