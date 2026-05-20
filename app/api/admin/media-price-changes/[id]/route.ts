import { NextRequest } from "next/server";
import { z } from "zod";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(2000).optional().nullable(),
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
  const existing = await db.mediaPriceChangeRequest.findUnique({
    where: { id },
    include: { media: { select: { id: true } } },
  });
  if (!existing) return json({ error: "Not found" }, 404);
  if (existing.status !== "PENDING") {
    return json({ error: "Already reviewed" }, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.mediaPriceChangeRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewNote: parsed.data.reviewNote?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    if (parsed.data.status === "APPROVED") {
      await tx.media.update({
        where: { id: existing.mediaId },
        data: { price: existing.requestedPrice },
      });
      await tx.mediaPriceSnapshot.create({
        data: {
          mediaId: existing.mediaId,
          price: existing.requestedPrice,
          note: `매체사 단가 수정 승인 (${existing.requestedPrice})`,
        },
      });
    }
    return row;
  });

  return json({ request: updated });
}
