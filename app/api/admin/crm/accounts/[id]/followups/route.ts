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

  const title = String(body.title ?? "").trim();
  const dueAt = body.dueAt ? new Date(String(body.dueAt)) : null;
  if (!title || !dueAt || Number.isNaN(dueAt.getTime())) {
    return json({ error: "title and dueAt required" }, 400);
  }

  const db = getPrisma();
  const acc = await db.crmAccount.findUnique({ where: { id: accountId } });
  if (!acc) return json({ error: "Account not found" }, 404);

  const followUp = await db.crmFollowUp.create({
    data: {
      accountId,
      title,
      dueAt,
      remindEmail: String(body.remindEmail ?? "").trim() || null,
    },
  });
  return json({ followUp }, 201);
}
