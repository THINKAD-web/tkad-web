/**
 * RUN_PACKAGE_DISCOUNT_DB_TEST=1 일 때만 실행 (공유 Neon 등에 규칙 2건 삽입 후 견적 파이프 검증).
 * 기본 CI·로컬은 skip.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import type { PackageDiscountRuleDTO } from "@/lib/pricing/package-discount";

const RUN = process.env.RUN_PACKAGE_DISCOUNT_DB_TEST === "1";

test("DB integration — fixture rules via Prisma (optional)", { skip: !RUN }, async () => {
  const { prisma } = await import("@/lib/prisma");
  const suffix = Date.now().toString(36);
  const idA = `test-pkg-${suffix}-a`;
  const idB = `test-pkg-${suffix}-b`;
  try {
    await prisma.packageDiscountRule.createMany({
      data: [
        {
          id: idA,
          active: true,
          priority: 5,
          labelKo: "테스트 2매체 5%",
          minMediaCount: 2,
          discountPercent: 5,
        },
        {
          id: idB,
          active: true,
          priority: 10,
          labelKo: "테스트 10% 넓은",
          discountPercent: 10,
        },
      ],
    });
    const rows = await prisma.packageDiscountRule.findMany({
      where: { id: { in: [idA, idB] } },
    });
    const rules: PackageDiscountRuleDTO[] = rows.map((r) => ({
      id: r.id,
      active: r.active,
      priority: r.priority,
      labelKo: r.labelKo,
      minMediaCount: r.minMediaCount,
      maxMediaCount: r.maxMediaCount,
      minSupplyWon: r.minSupplyWon,
      maxSupplyWon: r.maxSupplyWon,
      discountPercent: r.discountPercent,
      stackable: r.stackable,
      validFrom: r.validFrom,
      validTo: r.validTo,
    }));
    const totals = computeAdminQuoteTotals({
      lineWons: [4_000_000, 4_000_000],
      discountPercent: 0,
      discountWon: 0,
      vatIncluded: false,
      packageDiscount: {
        rules,
        packageDiscountSource: "auto",
      },
    });
    assert.equal(totals.packageDiscount?.matchedRule?.id, idA);
    assert.equal(totals.packageDiscount?.packageDiscountPercent, 5);
    assert.equal(totals.packageDiscount?.packageDiscountWon, 400_000);
  } finally {
    await prisma.packageDiscountRule.deleteMany({
      where: { id: { in: [idA, idB] } },
    });
    await prisma.$disconnect();
  }
});
