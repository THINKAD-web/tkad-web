import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { getAdminSavedPlanCart } from "@/lib/saved-plan-cart/admin-queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const PatchBodySchema = z.object({
  adminNote: z.string().trim().max(5000).nullable().optional(),
  publishIntent: z.enum(["case", "community"]).nullable().optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const detail = await getAdminSavedPlanCart(id);
    if (!detail) {
      return json({ error: "Not found" }, 404);
    }
    return json(detail);
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Validation failed", issues: parsed.error.issues }, 400);
    }

    const db = getPrisma();
    const existing = await db.savedPlanCart.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return json({ error: "Not found" }, 404);
    }

    const updated = await db.savedPlanCart.update({
      where: { id },
      data: {
        ...(parsed.data.adminNote !== undefined
          ? { adminNote: parsed.data.adminNote }
          : {}),
        ...(parsed.data.publishIntent !== undefined
          ? { publishIntent: parsed.data.publishIntent }
          : {}),
      },
    });

    const detail = await getAdminSavedPlanCart(updated.id);
    return json(detail);
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
