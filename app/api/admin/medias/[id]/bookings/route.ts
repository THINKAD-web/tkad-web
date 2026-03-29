import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;
  const db = getPrisma();
  const bookings = await db.mediaBooking.findMany({
    where: { mediaId },
    orderBy: { startsAt: "asc" },
    include: { campaign: { select: { id: true, name: true } } },
  });
  return json({ bookings });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const title = String(body.title ?? "").trim();
  const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  if (!title || !startsAt || !endsAt || endsAt <= startsAt) {
    return json({ error: "Invalid booking" }, 400);
  }

  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Media not found" }, 404);

  const campaignId = String(body.campaignId ?? "").trim() || null;
  if (campaignId) {
    const c = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!c) return json({ error: "Campaign not found" }, 400);
  }

  const booking = await db.mediaBooking.create({
    data: {
      mediaId,
      title,
      startsAt,
      endsAt,
      status: String(body.status ?? "hold").trim() || "hold",
      campaignId,
      notes: String(body.notes ?? "").trim() || null,
    },
  });
  return json({ booking }, 201);
}
