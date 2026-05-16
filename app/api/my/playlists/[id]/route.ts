import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import {
  isValidDaysArray,
  isValidHHMM,
  type PlaylistDetail,
  type PlaylistSchedule,
} from "@/lib/creatives/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ScheduleRuleSchema = z
  .object({
    id: z.string().min(1).max(64),
    creativeId: z.string().min(1).max(64),
    days: z.array(z.number().int().min(0).max(6)).max(7),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    note: z.string().max(200).optional(),
  })
  .refine((r) => isValidDaysArray(r.days), { message: "days 값이 잘못되었습니다." })
  .refine((r) => !r.startTime || isValidHHMM(r.startTime), {
    message: "startTime 형식이 잘못되었습니다.",
  })
  .refine((r) => !r.endTime || isValidHHMM(r.endTime), {
    message: "endTime 형식이 잘못되었습니다.",
  });

const ScheduleSchema = z
  .object({ rules: z.array(ScheduleRuleSchema).max(50) })
  .nullable()
  .optional();

const ItemSchema = z.object({
  creativeId: z.string().min(1).max(64),
  durationSec: z.number().int().min(1).max(60 * 60),
});

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  items: z.array(ItemSchema).min(1).max(50).optional(),
  schedule: ScheduleSchema,
});

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
    const row = await prisma.creativePlaylist.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        items: {
          orderBy: [{ order: "asc" }],
          include: {
            creative: {
              select: {
                id: true,
                name: true,
                type: true,
                url: true,
                thumbnailUrl: true,
                duration: true,
              },
            },
          },
        },
      },
    });
    if (!row) return apiError("NOT_FOUND", 404);

    const detail: PlaylistDetail = {
      id: row.id,
      name: row.name,
      description: row.description,
      schedule: (row.scheduleJson as unknown as PlaylistSchedule | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: row.items.map((it) => ({
        id: it.id,
        creativeId: it.creativeId,
        durationSec: it.durationSec,
        order: it.order,
        creative: {
          id: it.creative.id,
          name: it.creative.name,
          type: it.creative.type,
          url: it.creative.url,
          thumbnailUrl: it.creative.thumbnailUrl,
          duration: it.creative.duration,
        },
      })),
    };
    return apiOk(detail);
  } catch (e) {
    return apiServerError(e, "my/playlists/get");
  }
}

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
    const row = await prisma.creativePlaylist.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!row) return apiError("NOT_FOUND", 404);

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);
    const { name, description, items, schedule } = parsed.data;

    if (items) {
      const creativeIds = items.map((i) => i.creativeId);
      const owned = await prisma.creative.findMany({
        where: { userId: user.id, id: { in: creativeIds }, deletedAt: null },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((o) => o.id));
      const unknown = creativeIds.filter((cid) => !ownedSet.has(cid));
      if (unknown.length > 0) {
        return apiError("INVALID_CREATIVES", 400, {
          message: "선택할 수 없는 소재가 포함돼 있습니다.",
          issues: { unknown },
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.creativePlaylist.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description ?? null }),
          ...(schedule !== undefined && {
            scheduleJson: (schedule ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          }),
        },
      });
      if (items) {
        await tx.creativePlaylistItem.deleteMany({
          where: { playlistId: id },
        });
        await tx.creativePlaylistItem.createMany({
          data: items.map((it, idx) => ({
            playlistId: id,
            creativeId: it.creativeId,
            durationSec: it.durationSec,
            order: idx,
          })),
        });
      }
    });

    return apiOk({ id });
  } catch (e) {
    return apiServerError(e, "my/playlists/patch");
  }
}

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
    const row = await prisma.creativePlaylist.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!row) return apiError("NOT_FOUND", 404);

    await prisma.creativePlaylist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return apiOk({ id });
  } catch (e) {
    return apiServerError(e, "my/playlists/delete");
  }
}
