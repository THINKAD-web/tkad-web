import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const templates = await db.quoteTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return json({ templates });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? "").trim();
  if (!name || !bodyHtml) {
    return json({ error: "name and bodyHtml required" }, 400);
  }

  const isDefault = Boolean(body.isDefault);
  const db = getPrisma();

  if (isDefault) {
    await db.quoteTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await db.quoteTemplate.create({
    data: {
      name,
      bodyHtml,
      headerHtml: String(body.headerHtml ?? "").trim() || null,
      footerHtml: String(body.footerHtml ?? "").trim() || null,
      isDefault,
    },
  });

  return json({ template }, 201);
}
