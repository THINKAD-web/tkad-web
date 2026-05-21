import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  await db.potentialMedia.update({
    where: { id },
    data: { outreachStatus: "SKIPPED" },
  });
  return json({ ok: true });
}
