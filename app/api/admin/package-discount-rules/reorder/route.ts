import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 드래그/수동 정렬 후 priority를 10, 20, … 로 재할당 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { orderedIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.map((id) => String(id))
    : [];
  if (orderedIds.length === 0) {
    return json({ error: "orderedIds required" }, 400);
  }

  const db = getPrisma();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.packageDiscountRule.update({
        where: { id },
        data: { priority: (index + 1) * 10 },
      }),
    ),
  );

  return json({ ok: true });
}
