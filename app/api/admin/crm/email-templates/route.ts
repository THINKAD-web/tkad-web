import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { ensureDefaultEmailTemplates } from "@/lib/crm-email-templates-db";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  await ensureDefaultEmailTemplates();
  const db = getPrisma();
  const templates = await db.emailTemplate.findMany({
    orderBy: { slug: "asc" },
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

  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? "").trim();
  if (!slug || !name || !subject || !bodyHtml) {
    return json({ error: "slug, name, subject, bodyHtml required" }, 400);
  }

  const db = getPrisma();
  try {
    const template = await db.emailTemplate.create({
      data: {
        slug,
        name,
        subject,
        bodyHtml,
        bodyText: String(body.bodyText ?? "").trim() || null,
      },
    });
    return json({ template }, 201);
  } catch {
    return json({ error: "Duplicate slug" }, 409);
  }
}
