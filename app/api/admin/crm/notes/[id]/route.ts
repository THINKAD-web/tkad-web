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

  const noteBody = String(body.body ?? "").trim();
  if (!noteBody) return json({ error: "body required" }, 400);

  const db = getPrisma();
  try {
    const note = await db.crmNote.update({
      where: { id },
      data: { body: noteBody },
    });
    return json({ note });
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
    await db.crmNote.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
