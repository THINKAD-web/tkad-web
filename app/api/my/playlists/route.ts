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
import type { PlaylistListItem } from "@/lib/creatives/types";
import { isValidDaysArray, isValidHHMM } from "@/lib/creatives/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 스케줄 JSON zod 검증 — 클라이언트 → DB 저장 시 통과해야 함. */
const ScheduleRuleSchema = z
  .object({
    id: z.string().min(1).max(64),
    creativeId: z.string().min(1).max(64),
    days: z.array(z.number().int().min(0).max(6)).max(7),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    note: z.string().max(200).optional(),
  })
  .refine(
    (r) => isValidDaysArray(r.days),
    { message: "days 값이 잘못되었습니다." },
  )
  .refine(
    (r) => !r.startTime || isValidHHMM(r.startTime),
    { message: "startTime 형식이 잘못되었습니다." },
  )
  .refine(
    (r) => !r.endTime || isValidHHMM(r.endTime),
    { message: "endTime 형식이 잘못되었습니다." },
  );

const ScheduleSchema = z
  .object({
    rules: z.array(ScheduleRuleSchema).max(50),
  })
  .nullable()
  .optional();

const ItemSchema = z.object({
  creativeId: z.string().min(1).max(64),
  durationSec: z.number().int().min(1).max(60 * 60),
});

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  items: z.array(ItemSchema).min(1).max(50),
  schedule: ScheduleSchema,
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const rows = await prisma.creativePlaylist.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: { select: { items: true } },
        items: { select: { durationSec: true } },
      },
    });

    const items: PlaylistListItem[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      itemCount: p._count.items,
      totalDurationSec: p.items.reduce((sum, it) => sum + it.durationSec, 0),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return apiOk({ items, total: items.length });
  } catch (e) {
    return apiServerError(e, "my/playlists/list");
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
    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);
    const { name, description, items, schedule } = parsed.data;

    // 모든 creativeId 가 본인 소유인지 확인
    const creativeIds = items.map((i) => i.creativeId);
    const owned = await prisma.creative.findMany({
      where: { userId: user.id, id: { in: creativeIds }, deletedAt: null },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((o) => o.id));
    const unknown = creativeIds.filter((id) => !ownedSet.has(id));
    if (unknown.length > 0) {
      return apiError("INVALID_CREATIVES", 400, {
        message: "선택할 수 없는 소재가 포함돼 있습니다.",
        issues: { unknown },
      });
    }

    const created = await prisma.creativePlaylist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description ?? null,
        scheduleJson: schedule
          ? (schedule as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        items: {
          create: items.map((it, idx) => ({
            creativeId: it.creativeId,
            durationSec: it.durationSec,
            order: idx,
          })),
        },
      },
      select: { id: true },
    });

    return apiOk({ id: created.id }, { status: 201 });
  } catch (e) {
    return apiServerError(e, "my/playlists/create");
  }
}
