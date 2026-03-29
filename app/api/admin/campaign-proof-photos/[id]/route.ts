import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.campaignProofPhoto.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
