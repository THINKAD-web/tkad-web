import { NextRequest } from "next/server";
import { z } from "zod";
import { activeBookingWhere } from "@/lib/booking-conflict";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { withApiKeyAuth, v1Error } from "@/lib/api-key-auth";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOOKAHEAD_DAYS = 180;
const DEFAULT_LOOKAHEAD_DAYS = 90;

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
});

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id: mediaId } = await params;
  return withApiKeyAuth(
    request,
    `/api/v1/media/${mediaId}/availability`,
    async () => {
      const url = new URL(request.url);
      const parsed = querySchema.safeParse({
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      });
      if (!parsed.success) {
        return v1Error("INVALID_INPUT", 400, "Invalid query parameters");
      }

      const today = startOfDay(new Date());
      const fromDate = parsed.data.from
        ? startOfDay(new Date(`${parsed.data.from}T00:00:00`))
        : today;
      const toDate = parsed.data.to
        ? startOfDay(new Date(`${parsed.data.to}T00:00:00`))
        : new Date(today.getTime() + DEFAULT_LOOKAHEAD_DAYS * 86400000);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return v1Error("INVALID_INPUT", 400, "Invalid date range");
      }
      if (toDate <= fromDate) {
        return v1Error("INVALID_INPUT", 400, "to must be greater than from");
      }

      const maxTo = new Date(today.getTime() + MAX_LOOKAHEAD_DAYS * 86400000);
      const cappedTo = toDate > maxTo ? maxTo : toDate;

      if (!isDatabaseConfigured()) {
        return Response.json({
          data: {
            mediaId,
            from: ymd(fromDate),
            to: ymd(cappedTo),
            blockedRanges: [],
          },
        });
      }

      const db = getPrisma();
      const media = await db.media.findFirst({
        where: publicActiveMediaWhere({ id: mediaId }),
        select: { id: true, isActive: true },
      });
      if (!media) {
        return v1Error("NOT_FOUND", 404, "Media not found");
      }

      const bookings = await db.mediaBooking.findMany({
        where: {
          mediaId,
          ...activeBookingWhere(),
          startsAt: { lt: cappedTo },
          endsAt: { gt: fromDate },
        },
        select: { startsAt: true, endsAt: true },
        orderBy: { startsAt: "asc" },
      });

      const blockedRanges = bookings.map((b) => {
        const start = b.startsAt < fromDate ? fromDate : b.startsAt;
        const end = b.endsAt > cappedTo ? cappedTo : b.endsAt;
        return {
          start: start.toISOString(),
          end: end.toISOString(),
          status: "blocked" as const,
        };
      });

      return Response.json({
        data: {
          mediaId,
          from: ymd(fromDate),
          to: ymd(cappedTo),
          blockedRanges,
        },
      });
    },
  );
}
