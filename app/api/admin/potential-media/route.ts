import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { discoverPotentialMedia } from "@/lib/potential-media-discovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const status = request.nextUrl.searchParams.get("status");
  const db = getPrisma();
  const rows = await db.potentialMedia.findMany({
    where: status ? { outreachStatus: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ ok: true, rows });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action: string }).action)
      : "discover";

  if (action === "discover") {
    const result = await discoverPotentialMedia();
    return json({ ok: true, ...result });
  }

  return json({ error: "unknown_action" }, 400);
}
