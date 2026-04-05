import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const mediaId = String(body.mediaId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  const status = String(body.status ?? "confirmed").trim();

  if (!mediaId || !startsAt || !endsAt) {
    return json({ error: "mediaId, startsAt, endsAt 필수" }, 400);
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) return json({ error: "Campaign not found" }, 404);

  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Media not found" }, 404);

  const booking = await db.mediaBooking.create({
    data: {
      campaignId: id,
      mediaId,
      title: title || media.name,
      startsAt,
      endsAt,
      status,
    },
    include: { media: { select: { name: true, location: true, dailyFootfall: true } } },
  });

  return json({ booking }, 201);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("bookingId");
  if (!bookingId) return json({ error: "bookingId 필수" }, 400);

  const db = getPrisma();
  const booking = await db.mediaBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.campaignId !== campaignId) return json({ error: "Not found" }, 404);

  await db.mediaBooking.delete({ where: { id: bookingId } });
  return json({ ok: true });
}
