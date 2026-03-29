import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BLOCKED = new Set<OoHQuoteStatus>([
  OoHQuoteStatus.completed,
  OoHQuoteStatus.cancelled,
]);

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const reason = String(body.reason ?? body.cancelReason ?? "").trim();
  if (!reason) {
    return json({ error: "reason required" }, 400);
  }

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (BLOCKED.has(row.status)) {
    return json({ error: "Already terminal" }, 409);
  }
  if (row.campaignId) {
    return json({ error: "Campaign already linked; cancel in CRM" }, 409);
  }

  const updated = await db.ooHQuote.update({
    where: { id },
    data: {
      status: OoHQuoteStatus.cancelled,
      cancelReason: reason,
    },
  });

  return json({ ok: true, status: updated.status });
}
