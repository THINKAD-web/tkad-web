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
  if (body.dueAt != null) {
    data.dueAt = new Date(String(body.dueAt));
    data.reminderSentAt = null;
  }
  if (body.remindEmail !== undefined)
    data.remindEmail = String(body.remindEmail ?? "").trim() || null;

  if (body.done === true) {
    data.doneAt = new Date();
  } else if (body.done === false) {
    data.doneAt = null;
  }

  const db = getPrisma();
  try {
    const followUp = await db.crmFollowUp.update({ where: { id }, data });
    return json({ followUp });
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
    await db.crmFollowUp.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
