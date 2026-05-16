import { NextRequest } from "next/server";
import { MediaPeriodStatus } from "@prisma/client";
import { z } from "zod";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  fetchMediaMonthAvailability,
  parseAvailabilityMonth,
  startOfDay,
  ymd,
} from "@/lib/media-availability-month";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  mediaId: z.string().trim().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const createSchema = z.object({
  mediaId: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.nativeEnum(MediaPeriodStatus),
  note: z.string().max(2000).optional().nullable(),
});

function parseDateOnly(value: string): Date {
  return startOfDay(new Date(`${value}T00:00:00`));
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    mediaId: url.searchParams.get("mediaId") ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id: parsed.data.mediaId },
    select: { id: true },
  });
  if (!media) return json({ error: "Media not found" }, 404);

  try {
    const payload = await fetchMediaMonthAvailability(
      db,
      parsed.data.mediaId,
      parsed.data.month,
    );
    return json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid month";
    return json({ error: message }, 400);
  }
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  const startDate = parseDateOnly(parsed.data.startDate);
  const endDate = parseDateOnly(parsed.data.endDate);
  if (endDate < startDate) {
    return json({ error: "endDate must be on or after startDate" }, 400);
  }

  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id: parsed.data.mediaId },
    select: { id: true },
  });
  if (!media) return json({ error: "Media not found" }, 404);

  const period = await db.mediaAvailabilityPeriod.create({
    data: {
      mediaId: parsed.data.mediaId,
      startDate,
      endDate,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
    },
  });

  const month =
    parsed.data.startDate.slice(0, 7) === parsed.data.endDate.slice(0, 7)
      ? parsed.data.startDate.slice(0, 7)
      : ymd(startDate).slice(0, 7);

  try {
    parseAvailabilityMonth(month);
  } catch {
    /* use start month */
  }

  return json({
    period: {
      id: period.id,
      startDate: ymd(period.startDate),
      endDate: ymd(period.endDate),
      status: period.status,
      note: period.note,
    },
  });
}
