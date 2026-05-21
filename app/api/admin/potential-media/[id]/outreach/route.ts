import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { sendPotentialMediaOutreach } from "@/lib/media-owner-outreach";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const db = getPrisma();
  const lead = await db.potentialMedia.findUnique({ where: { id } });
  if (!lead) return json({ error: "not_found" }, 404);

  const contact = lead.contactInfo as { email?: string } | null;
  const email = (body.email ?? contact?.email ?? lead.outreachEmail ?? "").trim();
  if (!email) return json({ error: "email_required" }, 400);

  const result = await sendPotentialMediaOutreach(id, email);
  if (!result.ok) {
    return json({ error: result.error ?? "send_failed" }, 400);
  }
  return json({ ok: true });
}
