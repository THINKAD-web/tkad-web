import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const advertiserName = String(body.advertiserName ?? "").trim();
  if (!advertiserName) {
    return json({ error: "advertiserName required" }, 400);
  }

  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Not found" }, 404);

  const row = await db.mediaAdvertiserExecution.create({
    data: {
      mediaId,
      advertiserName,
      campaignLabel: String(body.campaignLabel ?? "").trim() || null,
      periodStart: body.periodStart
        ? new Date(String(body.periodStart))
        : null,
      periodEnd: body.periodEnd ? new Date(String(body.periodEnd)) : null,
      note: String(body.note ?? "").trim() || null,
    },
  });
  return json({ execution: row }, 201);
}
