import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
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

    return apiOk({ items, ids, total: items.length });
  } catch (e) {
    return apiServerError(e, "my/favorites");
  }
}
