import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { getAdminSavedPlanCart } from "@/lib/saved-plan-cart/admin-queries";
import { promoteSavedPlanCart } from "@/lib/saved-plan-cart/promote";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  target: z.enum(["case", "community"]),
  publishCommunity: z.boolean().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
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

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Validation failed", issues: parsed.error.issues }, 400);
    }

    const detail = await getAdminSavedPlanCart(id);
    if (!detail) {
      return json({ error: "Not found" }, 404);
    }

    const result = await promoteSavedPlanCart({
      detail,
      target: parsed.data.target,
      publishCommunity: parsed.data.publishCommunity,
    });

    const refreshed = await getAdminSavedPlanCart(id);
    return json({ ...result, detail: refreshed }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Promote failed";
    return json({ error: msg }, 500);
  }
}
