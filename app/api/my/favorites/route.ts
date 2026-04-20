import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  const favs = await prisma.userFavoriteMedia.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { mediaId: true, createdAt: true },
  });
  const ids = favs.map((f) => f.mediaId);

  const catalog = await fetchPublicMediaCatalog();
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const items = favs
    .map((f) => {
      const m = byId.get(f.mediaId);
      if (!m) return null;
      return {
        id: m.id,
        name: m.name,
        location: m.location,
        region: m.region,
        type: m.type,
        price: m.price,
        pricePeriod: m.pricePeriod ?? "month",
        image: m.sampleImages?.[0] ?? null,
        visibilityScore: m.visibilityScore ?? 0,
        favoritedAt: f.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return NextResponse.json({
    ok: true,
    data: { items, ids, total: items.length },
  });
}
