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
  const template = await db.emailTemplate.findUnique({ where: { id } });
  if (!template) return json({ error: "Not found" }, 404);
  return json({ template });
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
  if (body.name != null) data.name = String(body.name).trim();
  if (body.subject != null) data.subject = String(body.subject).trim();
  if (body.bodyHtml != null) data.bodyHtml = String(body.bodyHtml);
  if (body.bodyText !== undefined)
    data.bodyText = String(body.bodyText ?? "").trim() || null;

  const db = getPrisma();
  try {
    const template = await db.emailTemplate.update({ where: { id }, data });
    return json({ template });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
