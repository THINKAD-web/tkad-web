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
  if (body.name != null) data.name = String(body.name).trim();
  if (body.bodyHtml != null) data.bodyHtml = String(body.bodyHtml).trim();
  if (body.headerHtml !== undefined)
    data.headerHtml = String(body.headerHtml ?? "").trim() || null;
  if (body.footerHtml !== undefined)
    data.footerHtml = String(body.footerHtml ?? "").trim() || null;

  if (body.isDefault === true) {
    const db = getPrisma();
    await db.quoteTemplate.updateMany({ data: { isDefault: false } });
    data.isDefault = true;
  } else if (body.isDefault === false) {
    data.isDefault = false;
  }

  const db = getPrisma();
  try {
    const template = await db.quoteTemplate.update({ where: { id }, data });
    return json({ template });
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
    await db.quoteTemplate.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
