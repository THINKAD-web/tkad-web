import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { buildAlertsForPipelineCard } from "@/lib/crm-alerts";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const cards = await db.pipelineCard.findMany({
    where: { stage: { not: "completed" } },
  });

  const alerts = cards.flatMap(buildAlertsForPipelineCard);
  alerts.sort((a, b) => b.days - a.days);
  return json({ alerts, count: alerts.length });
}
