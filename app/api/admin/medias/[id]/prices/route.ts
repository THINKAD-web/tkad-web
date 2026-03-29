import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;
  const db = getPrisma();
  const rows = await db.mediaPriceSnapshot.findMany({
    where: { mediaId },
    orderBy: { effectiveFrom: "desc" },
    take: 100,
  });
  return json({ snapshots: rows });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const price = Math.round(Number(body.price ?? 0));
  if (!Number.isFinite(price) || price < 0) {
    return json({ error: "Invalid price" }, 400);
  }

  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Media not found" }, 404);

  const snapshot = await db.mediaPriceSnapshot.create({
    data: {
      mediaId,
      price,
      note: String(body.note ?? "").trim() || null,
    },
  });

  await db.media.update({
    where: { id: mediaId },
    data: { price },
  });

  return json({ snapshot }, 201);
}
