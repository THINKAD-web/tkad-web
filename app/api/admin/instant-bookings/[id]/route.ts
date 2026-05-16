import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { markBookingExecutionConfirmed } from "@/lib/instant-booking-fulfill";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const body = (await request.json()) as { action?: string };

  if (body.action !== "confirm_execution") {
    return json({ error: "Unknown action" }, 400);
  }

  try {
    const updated = await markBookingExecutionConfirmed(id);
    return json({
      ok: true,
      id: updated.id,
      status: updated.status,
      executionConfirmedAt: updated.executionConfirmedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[admin instant-bookings PATCH]", e);
    return json({ error: "Update failed" }, 500);
  }
}
