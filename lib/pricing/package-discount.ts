/** 패키지 할인 규칙 매칭·적용 (STEP3b). 규칙 테이블이 비어 있으면 할인 0%. */

export type PackageDiscountSource = "auto" | "manual_override" | "none";

export type PackageDiscountRuleDTO = {
  id: string;
  active: boolean;
  priority: number;
  labelKo: string;
  minMediaCount: number | null;
  maxMediaCount: number | null;
  minSupplyWon: number | null;
  maxSupplyWon: number | null;
  discountPercent: number;
  stackable: boolean;
  validFrom: Date | null;
  validTo: Date | null;
};

export type PackageDiscountInput = {
  lineSupplyWons: readonly number[];
  asOf?: Date;
  /** admin/quote override — auto 규칙 대신 강제 */
  forced?: {
    discountPercent: number;
    ruleId?: string | null;
    source: "manual_override";
  };
};

export type PackageDiscountResult = {
  linesSubtotalWon: number;
  mediaCount: number;
  matchedRule: {
    id: string;
    labelKo: string;
    discountPercent: number;
  } | null;
  packageDiscountPercent: number;
  packageDiscountWon: number;
  supplyAfterPackageWon: number;
};

const MS_PER_DAY = 86_400_000;

function utcDayStart(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function isRuleEffective(rule: PackageDiscountRuleDTO, asOf: Date): boolean {
  if (!rule.active) return false;
  const day = utcDayStart(asOf);
  if (rule.validFrom != null && day < utcDayStart(rule.validFrom)) return false;
  if (rule.validTo != null && day > utcDayStart(rule.validTo)) return false;
  return true;
}

function inInclusiveRange(
  value: number,
  min: number | null,
  max: number | null,
): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/** 집행 매체 수 — 공급가가 0보다 큰 라인만 집계 */
export function countBillableMediaLines(lineSupplyWons: readonly number[]): number {
  return lineSupplyWons.filter((w) => w > 0).length;
}

function clampDiscountPercent(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

function sortRulesForMatching(
  rules: readonly PackageDiscountRuleDTO[],
): PackageDiscountRuleDTO[] {
  return [...rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });
}

/** 첫 매칭 규칙 (stackable=false 기본 — 1건만) */
export function findFirstMatchingPackageDiscountRule(
  rules: readonly PackageDiscountRuleDTO[],
  ctx: {
    mediaCount: number;
    linesSubtotalWon: number;
    asOf: Date;
  },
): PackageDiscountRuleDTO | null {
  for (const rule of sortRulesForMatching(rules)) {
    if (!isRuleEffective(rule, ctx.asOf)) continue;
    if (
      !inInclusiveRange(ctx.mediaCount, rule.minMediaCount, rule.maxMediaCount)
    ) {
      continue;
    }
    if (
      !inInclusiveRange(
        ctx.linesSubtotalWon,
        rule.minSupplyWon,
        rule.maxSupplyWon,
      )
    ) {
      continue;
    }
    return rule;
  }
  return null;
}

function buildZeroPackageResult(
  linesSubtotalWon: number,
  mediaCount: number,
): PackageDiscountResult {
  return {
    linesSubtotalWon,
    mediaCount,
    matchedRule: null,
    packageDiscountPercent: 0,
    packageDiscountWon: 0,
    supplyAfterPackageWon: linesSubtotalWon,
  };
}

export function applyPackageDiscount(
  input: PackageDiscountInput,
  rules: readonly PackageDiscountRuleDTO[],
): PackageDiscountResult {
  const linesSubtotalWon = input.lineSupplyWons.reduce((a, b) => a + b, 0);
  const mediaCount = countBillableMediaLines(input.lineSupplyWons);
  const asOf = input.asOf ?? new Date();

  if (input.forced) {
    const pct = clampDiscountPercent(input.forced.discountPercent);
    const packageDiscountWon = Math.round((linesSubtotalWon * pct) / 100);
    const supplyAfterPackageWon = Math.max(
      0,
      linesSubtotalWon - packageDiscountWon,
    );
    const ruleFromId =
      input.forced.ruleId != null
        ? rules.find((r) => r.id === input.forced!.ruleId)
        : undefined;
    const matchedRule =
      ruleFromId != null
        ? {
            id: ruleFromId.id,
            labelKo: ruleFromId.labelKo,
            discountPercent: pct,
          }
        : input.forced.ruleId
          ? {
              id: input.forced.ruleId,
              labelKo: "",
              discountPercent: pct,
            }
          : null;
    return {
      linesSubtotalWon,
      mediaCount,
      matchedRule,
      packageDiscountPercent: pct,
      packageDiscountWon,
      supplyAfterPackageWon,
    };
  }

  const matched = findFirstMatchingPackageDiscountRule(rules, {
    mediaCount,
    linesSubtotalWon,
    asOf,
  });
  if (!matched) {
    return buildZeroPackageResult(linesSubtotalWon, mediaCount);
  }

  const pct = clampDiscountPercent(matched.discountPercent);
  const packageDiscountWon = Math.round((linesSubtotalWon * pct) / 100);
  const supplyAfterPackageWon = Math.max(
    0,
    linesSubtotalWon - packageDiscountWon,
  );
  return {
    linesSubtotalWon,
    mediaCount,
    matchedRule: {
      id: matched.id,
      labelKo: matched.labelKo,
      discountPercent: pct,
    },
    packageDiscountPercent: pct,
    packageDiscountWon,
    supplyAfterPackageWon,
  };
}
