import type { PackageDiscountRule } from "@prisma/client";
import type { PackageDiscountRuleDTO } from "@/lib/pricing/package-discount";

export type PackageDiscountRuleAdminRow = Omit<
  PackageDiscountRuleDTO,
  "validFrom" | "validTo"
> & {
  labelEn: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export function packageDiscountRuleToDto(
  row: PackageDiscountRule,
): PackageDiscountRuleDTO {
  return {
    id: row.id,
    active: row.active,
    priority: row.priority,
    labelKo: row.labelKo,
    minMediaCount: row.minMediaCount,
    maxMediaCount: row.maxMediaCount,
    minSupplyWon: row.minSupplyWon,
    maxSupplyWon: row.maxSupplyWon,
    discountPercent: row.discountPercent,
    stackable: row.stackable,
    validFrom: row.validFrom,
    validTo: row.validTo,
  };
}

export function packageDiscountRuleToAdminRow(
  row: PackageDiscountRule,
): PackageDiscountRuleAdminRow {
  const dto = packageDiscountRuleToDto(row);
  return {
    ...dto,
    validFrom: dto.validFrom?.toISOString() ?? null,
    validTo: dto.validTo?.toISOString() ?? null,
    labelEn: row.labelEn,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
