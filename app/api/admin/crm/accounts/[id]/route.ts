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
  const account = await db.crmAccount.findUnique({
    where: { id },
    include: {
      contactLogs: { orderBy: { createdAt: "desc" }, take: 100 },
      notes: { orderBy: { updatedAt: "desc" }, take: 100 },
      followUps: { orderBy: { dueAt: "asc" }, take: 50 },
      campaigns: { orderBy: { updatedAt: "desc" }, take: 20 },
    },
  });
  if (!account) return json({ error: "Not found" }, 404);
  return json({ account });
}

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
  if (body.company != null) data.company = String(body.company).trim();
  if (body.name != null) data.name = String(body.name).trim();
  if (body.phone !== undefined)
    data.phone = String(body.phone ?? "").trim() || null;

  const db = getPrisma();
  try {
    const account = await db.crmAccount.update({ where: { id }, data });
    return json({ account });
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
    await db.crmAccount.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
