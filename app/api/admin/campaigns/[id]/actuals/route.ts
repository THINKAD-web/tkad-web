import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { parseActualMetric } from "@/lib/campaign-actuals";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 어드민 — 캠페인 실측 실적(노출·도달) 수기 입력. */
export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const impressions = parseActualMetric(body.actualImpressions);
  const reach = parseActualMetric(body.actualReach);
  const cleared = impressions == null && reach == null;

  const db = getPrisma();
  const existing = await db.campaign.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const editor = await getCurrentUser().catch(() => null);

  try {
    const campaign = await db.campaign.update({
      where: { id },
      data: {
        actualImpressions: impressions,
        actualReach: reach,
        actualEnteredAt: cleared ? null : new Date(),
        actualSource: cleared ? null : "admin",
        actualEnteredById: cleared ? null : (editor?.id ?? null),
      },
      select: {
        id: true,
        actualImpressions: true,
        actualReach: true,
        actualEnteredAt: true,
        actualSource: true,
      },
    });
    return json({ ok: true, campaign });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
