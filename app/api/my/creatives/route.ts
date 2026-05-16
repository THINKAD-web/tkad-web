import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import type { CreativeListItem } from "@/lib/creatives/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  type: z.enum(["image", "video", "all"]).default("all"),
  used: z.enum(["all", "used", "unused"]).default("all"),
  q: z.string().max(80).optional(),
});

/**
 * GET /api/my/creatives?type=image|video|all&used=all|used|unused&q=...
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      type: url.searchParams.get("type") ?? "all",
      used: url.searchParams.get("used") ?? "all",
      q: url.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) return apiZodError(parsed.error);
    const { type, used, q } = parsed.data;

    const rows = await prisma.creative.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(type !== "all" && { type }),
        ...(q && q.length > 0
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { fileName: { contains: q, mode: "insensitive" } },
                { tags: { hasSome: [q] } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        _count: {
          select: { bookings: true, playlistItems: true },
        },
      },
    });

    const items: CreativeListItem[] = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        url: r.url,
        thumbnailUrl: r.thumbnailUrl,
        width: r.width,
        height: r.height,
        fileSize: r.fileSize,
        duration: r.duration,
        fileName: r.fileName,
        tags: r.tags,
        createdAt: r.createdAt.toISOString(),
        usageCount: r._count.bookings + r._count.playlistItems,
      }))
      .filter((r) => {
        if (used === "used") return r.usageCount > 0;
        if (used === "unused") return r.usageCount === 0;
        return true;
      });

    return apiOk({ items, total: items.length });
  } catch (e) {
    return apiServerError(e, "my/creatives/list");
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["image", "video"]),
  url: z.string().url().max(2000),
  publicId: z.string().max(200).optional().nullable(),
  fileName: z.string().max(200).optional().nullable(),
  width: z.number().int().positive().max(20000).optional().nullable(),
  height: z.number().int().positive().max(20000).optional().nullable(),
  fileSize: z.number().int().nonnegative().max(2_000_000_000).optional().nullable(),
  duration: z.number().int().nonnegative().max(60 * 60 * 6).optional().nullable(),
  thumbnailUrl: z.string().url().max(2000).optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
});

/**
 * POST /api/my/creatives — Cloudinary 직접 업로드 후 DB 행 생성
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const data = parsed.data;
    const created = await prisma.creative.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        type: data.type,
        url: data.url,
        publicId: data.publicId ?? null,
        fileName: data.fileName ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        fileSize: data.fileSize ?? null,
        duration: data.duration ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        tags: data.tags ?? [],
      },
      select: { id: true },
    });

    return apiOk({ id: created.id }, { status: 201 });
  } catch (e) {
    return apiServerError(e, "my/creatives/create");
  }
}
