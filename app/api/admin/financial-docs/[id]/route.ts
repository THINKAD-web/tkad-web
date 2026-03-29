import { NextRequest } from "next/server";
import { FinancialDocStatus } from "@prisma/client";
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
  if (body.amountKrw !== undefined)
    data.amountKrw =
      body.amountKrw == null ? null : Number(body.amountKrw) || null;
  if (body.documentUrl !== undefined)
    data.documentUrl = String(body.documentUrl ?? "").trim() || null;
  if (body.dueDate !== undefined)
    data.dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
  if (body.paidAt !== undefined)
    data.paidAt = body.paidAt ? new Date(String(body.paidAt)) : null;

  if (body.status != null) {
    const s = String(body.status);
    if (!Object.values(FinancialDocStatus).includes(s as FinancialDocStatus)) {
      return json({ error: "Invalid status" }, 400);
    }
    data.status = s as FinancialDocStatus;
  }

  const db = getPrisma();
  try {
    const document = await db.campaignFinancialDoc.update({
      where: { id },
      data,
    });
    return json({ document });
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
    await db.campaignFinancialDoc.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
