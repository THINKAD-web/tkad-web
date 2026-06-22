import { featureLabel } from "@/lib/report-access-shared";
import {
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
} from "@/lib/plan-cart-limits";
import {
  AI_DAILY_LIMITS,
  AI_HOURLY_ABUSE_LIMIT,
  API_KEY_MONTHLY_LIMITS,
  COMPARE_MAX_ITEMS,
  FAVORITES_GUEST_MAX,
  FREE_PLANNER_PDF_LIMIT,
  PRO_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
} from "@/lib/entitlements/constants";
import {
  FEATURE_MIN_LEVEL,
  type EntitlementAccessLevel,
  type ReportFeature,
} from "@/lib/entitlements/features";
import { isFeatureAllowedAtLevel } from "@/lib/entitlements/gate-ui";
import {
  getProDiscountPercent,
  getProPriceDisplay,
} from "@/lib/entitlements/pricing";

/** Admin matrix columns — maps display tier → entitlement access level for gates */
export type MatrixTierColumnId = "guest" | "free" | "pro" | "enterprise";

export const MATRIX_TIER_COLUMNS: {
  id: MatrixTierColumnId;
  labelKo: string;
  labelEn: string;
  accessLevel: EntitlementAccessLevel;
}[] = [
  { id: "guest", labelKo: "비회원", labelEn: "Guest", accessLevel: "FREE" },
  { id: "free", labelKo: "FREE", labelEn: "FREE", accessLevel: "MEMBER" },
  { id: "pro", labelKo: "PRO", labelEn: "PRO", accessLevel: "PRO" },
  {
    id: "enterprise",
    labelKo: "Enterprise",
    labelEn: "Enterprise",
    accessLevel: "ENTERPRISE",
  },
];

export type MatrixCellKind =
  | "allowed"
  | "login_required"
  | "pro_required"
  | "enterprise_required"
  | "blocked"
  | "value"
  | "na";

export type MatrixCell = {
  kind: MatrixCellKind;
  display: string;
};

export type MatrixFeatureRow = {
  id: ReportFeature;
  label: string;
  minLevel: EntitlementAccessLevel;
  cells: Record<MatrixTierColumnId, MatrixCell>;
};

export type MatrixLimitRow = {
  id: string;
  label: string;
  cells: Record<MatrixTierColumnId, MatrixCell>;
};

export type MatrixPricingSummary = {
  listPriceKrw: number;
  discountPercent: number;
  salePriceKrw: number;
  hasDiscount: boolean;
  trialDays: number;
};

export type EntitlementsMatrix = {
  columns: typeof MATRIX_TIER_COLUMNS;
  featureRows: MatrixFeatureRow[];
  limitRows: MatrixLimitRow[];
  pricing: MatrixPricingSummary;
  generatedAt: string;
};

function isUnlimitedCount(n: number): boolean {
  return n >= Number.MAX_SAFE_INTEGER / 2;
}

function formatUnlimited(isKo: boolean): string {
  return isKo ? "무제한" : "Unlimited";
}

function formatCount(n: number, isKo: boolean, unitKo: string, unitEn: string): string {
  if (isUnlimitedCount(n)) return formatUnlimited(isKo);
  return isKo ? `${n.toLocaleString("ko-KR")}${unitKo}` : `${n.toLocaleString("en-US")}${unitEn}`;
}

function formatFeatureCell(
  feature: ReportFeature,
  column: (typeof MATRIX_TIER_COLUMNS)[number],
  isKo: boolean,
): MatrixCell {
  const minLevel = FEATURE_MIN_LEVEL[feature];
  const allowed = isFeatureAllowedAtLevel(feature, column.accessLevel);

  if (allowed) {
    return {
      kind: "allowed",
      display: isKo ? "✅ 가능" : "✅ Allowed",
    };
  }

  if (minLevel === "MEMBER" && column.id === "guest") {
    return {
      kind: "login_required",
      display: isKo ? "🔒 로그인" : "🔒 Sign in",
    };
  }

  if (minLevel === "PRO") {
    return {
      kind: "pro_required",
      display: isKo ? "🔒 PRO전용" : "🔒 PRO only",
    };
  }

  if (minLevel === "ENTERPRISE") {
    return {
      kind: "enterprise_required",
      display: isKo ? "🔒 Enterprise" : "🔒 Enterprise",
    };
  }

  return {
    kind: "blocked",
    display: isKo ? "❌ 차단" : "❌ Blocked",
  };
}

function valueCell(display: string): MatrixCell {
  return { kind: "value", display };
}

function naCell(isKo: boolean): MatrixCell {
  return { kind: "na", display: isKo ? "—" : "—" };
}

/** All ReportFeature keys from FEATURE_MIN_LEVEL — insertion order preserved */
export function listReportFeatures(): ReportFeature[] {
  return Object.keys(FEATURE_MIN_LEVEL) as ReportFeature[];
}

export function buildFeatureMatrixRows(isKo: boolean): MatrixFeatureRow[] {
  return listReportFeatures().map((feature) => ({
    id: feature,
    label: featureLabel(feature, isKo),
    minLevel: FEATURE_MIN_LEVEL[feature],
    cells: Object.fromEntries(
      MATRIX_TIER_COLUMNS.map((col) => [
        col.id,
        formatFeatureCell(feature, col, isKo),
      ]),
    ) as Record<MatrixTierColumnId, MatrixCell>,
  }));
}

type LimitRowBuilder = (isKo: boolean) => MatrixLimitRow;

const LIMIT_ROW_BUILDERS: LimitRowBuilder[] = [
  (isKo) => ({
    id: "ai_daily",
    label: isKo ? "AI 추천 (일일)" : "AI recommendations (daily)",
    cells: {
      guest: valueCell(formatCount(AI_DAILY_LIMITS.guest, isKo, "회/일", "/day")),
      free: valueCell(formatCount(AI_DAILY_LIMITS.user, isKo, "회/일", "/day")),
      pro: valueCell(formatCount(AI_DAILY_LIMITS.pro, isKo, "회/일", "/day")),
      enterprise: valueCell(
        formatCount(AI_DAILY_LIMITS.pro, isKo, "회/일", "/day"),
      ),
    },
  }),
  (isKo) => ({
    id: "ai_hourly_abuse",
    label: isKo ? "AI 시간당 IP 한도 (어뷰징)" : "AI hourly IP cap (abuse)",
    cells: Object.fromEntries(
      MATRIX_TIER_COLUMNS.map((col) => [
        col.id,
        valueCell(
          formatCount(AI_HOURLY_ABUSE_LIMIT, isKo, "회/시간", "/hour"),
        ),
      ]),
    ) as Record<MatrixTierColumnId, MatrixCell>,
  }),
  (isKo) => ({
    id: "plan_cart",
    label: isKo ? "플랜·추천 카트" : "Plan / recommend cart",
    cells: {
      guest: naCell(isKo),
      free: valueCell(
        formatCount(PLAN_CART_MAX_ITEMS_FREE, isKo, "개", " items"),
      ),
      pro: valueCell(
        formatCount(PLAN_CART_MAX_ITEMS_PRO, isKo, "개", " items"),
      ),
      enterprise: valueCell(
        formatCount(PLAN_CART_MAX_ITEMS_PRO, isKo, "개", " items"),
      ),
    },
  }),
  (isKo) => ({
    id: "compare",
    label: isKo ? "매체 비교함" : "Media compare cart",
    cells: Object.fromEntries(
      MATRIX_TIER_COLUMNS.map((col) => [
        col.id,
        valueCell(formatCount(COMPARE_MAX_ITEMS, isKo, "개", " items")),
      ]),
    ) as Record<MatrixTierColumnId, MatrixCell>,
  }),
  (isKo) => ({
    id: "favorites",
    label: isKo ? "매체 찜 (localStorage, 비회원)" : "Media favorites (guest localStorage)",
    cells: {
      guest: valueCell(
        formatCount(FAVORITES_GUEST_MAX, isKo, "개", " items"),
      ),
      free: naCell(isKo),
      pro: naCell(isKo),
      enterprise: naCell(isKo),
    },
  }),
  (isKo) => ({
    id: "planner_pdf_free",
    label: isKo ? "플래너 PDF 무료 (FREE_PLANNER_PDF_LIMIT)" : "Planner PDF free quota",
    cells: {
      guest: naCell(isKo),
      free: valueCell(
        formatCount(FREE_PLANNER_PDF_LIMIT, isKo, "회", " use(s)"),
      ),
      pro: naCell(isKo),
      enterprise: naCell(isKo),
    },
  }),
  (isKo) => ({
    id: "api_monthly",
    label: isKo ? "Public API (월간 요청)" : "Public API (monthly requests)",
    cells: {
      guest: naCell(isKo),
      free: valueCell(
        API_KEY_MONTHLY_LIMITS.FREE === null
          ? formatUnlimited(isKo)
          : formatCount(
              API_KEY_MONTHLY_LIMITS.FREE,
              isKo,
              "회/월",
              "/month",
            ),
      ),
      pro: valueCell(
        API_KEY_MONTHLY_LIMITS.PRO === null
          ? formatUnlimited(isKo)
          : formatCount(API_KEY_MONTHLY_LIMITS.PRO, isKo, "회/월", "/month"),
      ),
      enterprise: valueCell(
        API_KEY_MONTHLY_LIMITS.ENTERPRISE === null
          ? formatUnlimited(isKo)
          : formatCount(
              API_KEY_MONTHLY_LIMITS.ENTERPRISE,
              isKo,
              "회/월",
              "/month",
            ),
      ),
    },
  }),
];

export function buildLimitMatrixRows(isKo: boolean): MatrixLimitRow[] {
  return LIMIT_ROW_BUILDERS.map((build) => build(isKo));
}

export function buildPricingSummary(): MatrixPricingSummary {
  const display = getProPriceDisplay();
  return {
    listPriceKrw: PRO_MONTHLY_KRW,
    discountPercent: getProDiscountPercent(),
    salePriceKrw: display.salePriceKrw,
    hasDiscount: display.hasDiscount,
    trialDays: PRO_TRIAL_DAYS,
  };
}

export function buildEntitlementsMatrix(isKo: boolean): EntitlementsMatrix {
  return {
    columns: MATRIX_TIER_COLUMNS,
    featureRows: buildFeatureMatrixRows(isKo),
    limitRows: buildLimitMatrixRows(isKo),
    pricing: buildPricingSummary(),
    generatedAt: new Date().toISOString(),
  };
}
