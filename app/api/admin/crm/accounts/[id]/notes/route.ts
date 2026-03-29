import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: accountId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const noteBody = String(body.body ?? "").trim();
  if (!noteBody) return json({ error: "body required" }, 400);

  const db = getPrisma();
  const acc = await db.crmAccount.findUnique({ where: { id: accountId } });
  if (!acc) return json({ error: "Account not found" }, 404);

  const note = await db.crmNote.create({
    data: { accountId, body: noteBody },
  });
  return json({ note }, 201);
}
