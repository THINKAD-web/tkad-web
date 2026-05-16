/**
 * GET /api/media/[id]/availability?month=YYYY-MM
 * 매체 상세 가용 캘린더용 월별 일자 상태.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchMediaMonthAvailability } from "@/lib/media-availability-month";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id: mediaId } = await params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return Response.json({
      mediaId,
      month: parsed.data.month,
      days: {},
      periods: [],
    });
  }

  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { id: true, isActive: true },
  });
  if (!media || !media.isActive) {
    return Response.json({ error: "Media not found" }, { status: 404 });
  }

  try {
    const payload = await fetchMediaMonthAvailability(
      db,
      mediaId,
      parsed.data.month,
    );
    return Response.json(payload, {
      headers: {
        "cache-control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid month";
    return Response.json({ error: message }, { status: 400 });
  }
}
