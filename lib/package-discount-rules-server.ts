import type { PrismaClient } from "@prisma/client";
import { packageDiscountRuleToDto } from "@/lib/package-discount-rule-map";
import type { PackageDiscountRuleDTO } from "@/lib/pricing/package-discount";

export async function listActivePackageDiscountRules(
  db: PrismaClient,
): Promise<PackageDiscountRuleDTO[]> {
  const rows = await db.packageDiscountRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });
  return rows.map(packageDiscountRuleToDto);
}
