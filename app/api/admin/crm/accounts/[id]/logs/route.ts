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

  const channel = String(body.channel ?? "other").trim() || "other";
  const summary = String(body.summary ?? "").trim();
  if (!summary) return json({ error: "summary required" }, 400);

  const db = getPrisma();
  const acc = await db.crmAccount.findUnique({ where: { id: accountId } });
  if (!acc) return json({ error: "Account not found" }, 404);

  const log = await db.crmContactLog.create({
    data: { accountId, channel, summary },
  });
  return json({ log }, 201);
}
