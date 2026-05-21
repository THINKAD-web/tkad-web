import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { SalesRep } from "@/lib/ops/sales-team";

const KEY = "inquiry_assign_rr";

export async function pickRoundRobinRep(
  team: SalesRep[],
  industryCode?: string | null,
): Promise<SalesRep> {
  if (team.length === 0) {
    return { email: "sales@tkad.co.kr", name: "THINKAD Sales" };
  }

  const specialists = industryCode
    ? team.filter(
        (r) =>
          r.industries?.length &&
          r.industries.includes(industryCode),
      )
    : [];
  const pool = specialists.length > 0 ? specialists : team;

  if (!isDatabaseConfigured()) {
    return pool[0];
  }

  const db = getPrisma();
  const row = await db.opsAutomationState.upsert({
    where: { key: KEY },
    create: { key: KEY, intValue: 0 },
    update: {},
  });
  const idx = row.intValue % pool.length;
  await db.opsAutomationState.update({
    where: { key: KEY },
    data: { intValue: row.intValue + 1 },
  });
  return pool[idx];
}
