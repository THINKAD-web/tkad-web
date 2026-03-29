import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const events = await db.campaignScheduleEvent.findMany({
    where: { campaignId: id },
    orderBy: { startsAt: "asc" },
  });
  return json({ events });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;

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
    return json({ error: "Invalid schedule payload" }, 400);
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return json({ error: "Campaign not found" }, 404);

  const event = await db.campaignScheduleEvent.create({
    data: {
      campaignId,
      title,
      startsAt,
      endsAt,
      kind: String(body.kind ?? "broadcast").trim() || "broadcast",
    },
  });
  return json({ event }, 201);
}
