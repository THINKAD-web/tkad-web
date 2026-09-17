import type { PackageDiscountSource } from "@/lib/pricing/package-discount";

/** 자동 패키지 할인을 건너뛸지 (수동 할인·override 모드) */
export function shouldSkipAutoPackageDiscount(opts: {
  packageDiscountSource: PackageDiscountSource;
  manualDiscountPercent: number;
  manualDiscountWon: number;
}): boolean {
  const pct = Math.min(100, Math.max(0, opts.manualDiscountPercent));
  const won = Math.max(0, opts.manualDiscountWon);
  if (opts.packageDiscountSource === "manual_override") return true;
  if (pct > 0 || won > 0) return true;
  return false;
}

/** STEP3d — `packageDiscountSource=auto`일 때 수동 %·원 입력 비활성 */
export function isManualDiscountInputDisabled(opts: {
  packageDiscountSource: PackageDiscountSource;
  hasAppliedAutoPackageDiscount: boolean;
}): boolean {
  if (opts.packageDiscountSource === "auto" && opts.hasAppliedAutoPackageDiscount) {
    return true;
  }
  return false;
}

/** STEP3d — 수동 할인이 있으면 auto 패키지 할인 UI 비활성 */
export function isAutoPackageDiscountDisabled(opts: {
  packageDiscountSource: PackageDiscountSource;
  manualDiscountPercent: number;
  manualDiscountWon: number;
}): boolean {
  if (opts.packageDiscountSource === "manual_override") return true;
  return shouldSkipAutoPackageDiscount({
    packageDiscountSource: opts.packageDiscountSource,
    manualDiscountPercent: opts.manualDiscountPercent,
    manualDiscountWon: opts.manualDiscountWon,
  });
}
