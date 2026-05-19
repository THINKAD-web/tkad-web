import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import type { RecentlyViewedRecord } from "@/lib/recently-viewed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENTLY_VIEWED_MAX = 20;

const RecordSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(200),
  type: z.string().max(64),
  region: z.string().max(64),
  thumbnail: z.string().max(512).optional().default(""),
  price: z.number().finite(),
  visitedAt: z.string().min(1).max(40),
});

const PostBody = z.object({
  items: z.array(RecordSchema).max(RECENTLY_VIEWED_MAX),
});

function rowToRecord(row: {
  mediaId: string;
  name: string;
  type: string;
  region: string;
  thumbnail: string | null;
  price: number;
  visitedAt: Date;
}): RecentlyViewedRecord {
  return {
    id: row.mediaId,
    name: row.name,
    type: row.type,
    region: row.region,
    thumbnail: row.thumbnail ?? "",
    price: row.price,
    visitedAt: row.visitedAt.toISOString(),
  };
}

function mergeIncoming(items: RecentlyViewedRecord[]): RecentlyViewedRecord[] {
  const byId = new Map<string, RecentlyViewedRecord>();
  for (const item of items) {
    const prev = byId.get(item.id);
    if (
      !prev ||
      new Date(item.visitedAt).getTime() > new Date(prev.visitedAt).getTime()
    ) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
    )
    .slice(0, RECENTLY_VIEWED_MAX);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const rows = await prisma.userRecentlyViewedMedia.findMany({
      where: { userId: user.id },
      orderBy: { visitedAt: "desc" },
      take: RECENTLY_VIEWED_MAX,
    });

    return apiOk({ items: rows.map(rowToRecord) });
  } catch (e) {
    return apiServerError(e, "my/recently-viewed GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const merged = mergeIncoming(parsed.data.items);
    const keepIds = merged.map((m) => m.id);

    await prisma.$transaction([
      ...merged.map((item) =>
        prisma.userRecentlyViewedMedia.upsert({
          where: {
            userId_mediaId: { userId: user.id, mediaId: item.id },
          },
          create: {
            userId: user.id,
            mediaId: item.id,
            name: item.name,
            type: item.type,
            region: item.region,
            thumbnail: item.thumbnail || null,
            price: Math.round(item.price),
            visitedAt: new Date(item.visitedAt),
          },
          update: {
            name: item.name,
            type: item.type,
            region: item.region,
            thumbnail: item.thumbnail || null,
            price: Math.round(item.price),
            visitedAt: new Date(item.visitedAt),
          },
        }),
      ),
      prisma.userRecentlyViewedMedia.deleteMany({
        where: {
          userId: user.id,
          ...(keepIds.length > 0
            ? { mediaId: { notIn: keepIds } }
            : {}),
        },
      }),
    ]);

    return apiOk({ items: merged, synced: merged.length });
  } catch (e) {
    return apiServerError(e, "my/recently-viewed POST");
  }
}
