import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { listPointTransactions } from "@/lib/points";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");

    const result = await listPointTransactions(user.id, { cursor, limit });
    return apiOk(result);
  } catch (e) {
    return apiServerError(e, "points/transactions");
  }
}
