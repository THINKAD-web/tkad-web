import assert from "node:assert/strict";
import test from "node:test";
import { applyPackageDiscount } from "@/lib/pricing/package-discount";
import type { PackageDiscountRuleDTO } from "@/lib/pricing/package-discount";

test("비활성 규칙은 active 목록에서 제외되어 매칭되지 않음", () => {
  const activeOnly: PackageDiscountRuleDTO[] = [
    {
      id: "active-5",
      active: true,
      priority: 10,
      labelKo: "5%",
      minMediaCount: 2,
      maxMediaCount: null,
      minSupplyWon: null,
      maxSupplyWon: null,
      discountPercent: 5,
      stackable: false,
      validFrom: null,
      validTo: null,
    },
  ];
  const withInactive = [
    ...activeOnly,
    {
      ...activeOnly[0]!,
      id: "inactive-50",
      active: false,
      discountPercent: 50,
      priority: 1,
    },
  ];
  const lines = [5_000_000, 5_000_000];
  const fromActive = applyPackageDiscount({ lineSupplyWons: lines }, activeOnly);
  const fromAllInactiveFiltered = applyPackageDiscount(
    { lineSupplyWons: lines },
    withInactive.filter((r) => r.active),
  );
  assert.equal(fromActive.matchedRule?.id, "active-5");
  assert.equal(fromActive.packageDiscountPercent, 5);
  assert.deepEqual(fromActive, fromAllInactiveFiltered);
});
