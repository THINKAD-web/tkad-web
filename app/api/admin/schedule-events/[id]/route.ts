import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const data: Record<string, unknown> = {};
  if (body.title != null) data.title = String(body.title).trim();
  if (body.kind != null) data.kind = String(body.kind).trim();
  if (body.startsAt != null) data.startsAt = new Date(String(body.startsAt));
  if (body.endsAt != null) data.endsAt = new Date(String(body.endsAt));

  const db = getPrisma();
  try {
    const event = await db.campaignScheduleEvent.update({
      where: { id },
      data,
    });
    return json({ event });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.campaignScheduleEvent.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
