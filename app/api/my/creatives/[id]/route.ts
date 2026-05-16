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
import type { CreativeDetail } from "@/lib/creatives/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwnedCreative(userId: string, id: string) {
  return prisma.creative.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * GET /api/my/creatives/[id] — 상세 + 사용 이력
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const { id } = await ctx.params;
    const row = await loadOwnedCreative(user.id, id);
    if (!row) return apiError("NOT_FOUND", 404);

    const [bookings, playlistItems] = await Promise.all([
      prisma.booking.findMany({
        where: {
          OR: [{ creativeId: id }, { creativeUrl: row.url }],
          userId: user.id,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          startDate: true,
          endDate: true,
          media: { select: { name: true, nameEn: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.creativePlaylistItem.findMany({
        where: { creativeId: id, playlist: { userId: user.id, deletedAt: null } },
        select: {
          playlist: {
            select: { id: true, name: true, createdAt: true },
          },
        },
        take: 50,
      }),
    ]);

    const usages: CreativeDetail["usages"] = [
      ...bookings.map((b) => ({
        kind: "instant_booking" as const,
        id: b.id,
        title: `${b.media.name} (${b.startDate.toISOString().slice(0, 10)} ~ ${b.endDate.toISOString().slice(0, 10)})`,
        href: `/bookings/${b.id}`,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
      ...playlistItems
        .filter((p): p is { playlist: { id: string; name: string; createdAt: Date } } => !!p.playlist)
        .map((p) => ({
          kind: "campaign" as const,
          id: p.playlist.id,
          title: `플레이리스트 · ${p.playlist.name}`,
          href: `/creatives/playlists/${p.playlist.id}`,
          createdAt: p.playlist.createdAt.toISOString(),
        })),
    ];

    const detail: CreativeDetail = {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      width: row.width,
      height: row.height,
      fileSize: row.fileSize,
      duration: row.duration,
      fileName: row.fileName,
      tags: row.tags,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publicId: row.publicId,
      usages,
      usageCount: usages.length,
    };

    return apiOk(detail);
  } catch (e) {
    return apiServerError(e, "my/creatives/get");
  }
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const { id } = await ctx.params;
    const row = await loadOwnedCreative(user.id, id);
    if (!row) return apiError("NOT_FOUND", 404);

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { name, tags } = parsed.data;
    const updated = await prisma.creative.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(tags !== undefined && { tags }),
      },
      select: { id: true, name: true, tags: true },
    });
    return apiOk(updated);
  } catch (e) {
    return apiServerError(e, "my/creatives/patch");
  }
}

/**
 * DELETE /api/my/creatives/[id] — 소프트 삭제(deletedAt 설정).
 * Cloudinary 자체 객체는 그대로 두고 라이브러리에서만 숨김.
 * Booking 등 기존 참조는 영향 없음(creativeUrl 은 그대로 사용 가능).
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const { id } = await ctx.params;
    const row = await loadOwnedCreative(user.id, id);
    if (!row) return apiError("NOT_FOUND", 404);
    await prisma.creative.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return apiOk({ id });
  } catch (e) {
    return apiServerError(e, "my/creatives/delete");
  }
}
