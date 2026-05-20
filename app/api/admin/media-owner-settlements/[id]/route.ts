import { NextRequest } from "next/server";
import { z } from "zod";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { notifyMediaOwnerSettlementCompleted } from "@/lib/media-owner-notify";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Validation failed" }, 400);
  }

  const db = getPrisma();
  const existing = await db.mediaOwnerSettlement.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const updated = await db.mediaOwnerSettlement.update({
    where: { id },
    data: {
      status: parsed.data.status,
      completedAt:
        parsed.data.status === "COMPLETED" ? new Date() : existing.completedAt,
    },
  });

  if (
    parsed.data.status === "COMPLETED" &&
    existing.status !== "COMPLETED"
  ) {
    void notifyMediaOwnerSettlementCompleted({
      ownerUserId: updated.ownerUserId,
      periodMonth: updated.periodMonth,
      netWon: updated.netWon,
    }).catch((e) => console.error("[admin.settlement] alimtalk", e));
  }

  return json({ settlement: updated });
}
