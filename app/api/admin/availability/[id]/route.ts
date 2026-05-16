import { NextRequest } from "next/server";
import { MediaPeriodStatus } from "@prisma/client";
import { z } from "zod";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { startOfDay, ymd } from "@/lib/media-availability-month";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.nativeEnum(MediaPeriodStatus).optional(),
    note: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field required",
  });

function parseDateOnly(value: string): Date {
  return startOfDay(new Date(`${value}T00:00:00`));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  const db = getPrisma();
  const existing = await db.mediaAvailabilityPeriod.findUnique({
    where: { id },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const startDate = parsed.data.startDate
    ? parseDateOnly(parsed.data.startDate)
    : existing.startDate;
  const endDate = parsed.data.endDate
    ? parseDateOnly(parsed.data.endDate)
    : existing.endDate;
  if (endDate < startDate) {
    return json({ error: "endDate must be on or after startDate" }, 400);
  }

  const period = await db.mediaAvailabilityPeriod.update({
    where: { id },
    data: {
      startDate: parsed.data.startDate ? startDate : undefined,
      endDate: parsed.data.endDate ? endDate : undefined,
      status: parsed.data.status,
      note:
        parsed.data.note !== undefined ? parsed.data.note : undefined,
    },
  });

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

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.mediaAvailabilityPeriod.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
