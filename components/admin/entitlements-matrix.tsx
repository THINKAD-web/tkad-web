import type { EntitlementsMatrix } from "@/lib/entitlements/matrix";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  matrix: EntitlementsMatrix;
  isKo: boolean;
};

function MatrixTable({
  title,
  description,
  sectionLabel,
  rows,
  columns,
  isKo,
  minLevelColumn,
}: {
  title: string;
  description: string;
  sectionLabel: string;
  rows: { id: string; label: string; minLevel?: string; cells: EntitlementsMatrix["featureRows"][0]["cells"] }[];
  columns: EntitlementsMatrix["columns"];
  isKo: boolean;
  minLevelColumn?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-semibold"
              >
                {sectionLabel}
              </th>
              {minLevelColumn ? (
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-semibold text-muted-foreground"
                >
                  min
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className="px-3 py-2 text-center font-semibold whitespace-nowrap"
                >
                  {isKo ? col.labelKo : col.labelEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/40 hover:bg-muted/30"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left font-medium"
                >
                  <span className="block">{row.label}</span>
                  <span className="mt-0.5 block font-mono text-[10px] font-normal text-muted-foreground">
                    {row.id}
                  </span>
                </th>
                {minLevelColumn ? (
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                    {row.minLevel ?? "—"}
                  </td>
                ) : null}
                {columns.map((col) => {
                  const cell = row.cells[col.id];
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        "px-3 py-2.5 text-center whitespace-nowrap tabular-nums",
                        cell.kind === "allowed" && "text-emerald-600 dark:text-emerald-400",
                        (cell.kind === "pro_required" ||
                          cell.kind === "enterprise_required" ||
                          cell.kind === "login_required") &&
                          "text-amber-700 dark:text-amber-300",
                        cell.kind === "blocked" && "text-red-600 dark:text-red-400",
                        cell.kind === "value" && "text-foreground",
                        cell.kind === "na" && "text-muted-foreground",
                      )}
                    >
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function EntitlementsMatrixView({ matrix, isKo }: Props) {
  const { pricing, columns } = matrix;
  const colLabels = columns.map((c) => (isKo ? c.labelKo : c.labelEn));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isKo ? "PRO 가격 · 할인" : "PRO pricing & discount"}
          </CardTitle>
          <CardDescription>
            {isKo
              ? "lib/entitlements/constants.ts · pricing.ts 단일 소스"
              : "Single source: lib/entitlements/constants.ts · pricing.ts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isKo ? "원가 (PRO_MONTHLY_KRW)" : "List price"}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                ₩{pricing.listPriceKrw.toLocaleString(isKo ? "ko-KR" : "en-US")}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isKo ? "할인율 (getProDiscountPercent)" : "Discount %"}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {pricing.discountPercent}%
                {!pricing.hasDiscount ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {isKo ? "(미적용)" : "(off)"}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isKo ? "청구·표시가 (discountedProPriceKrw)" : "Sale price"}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {pricing.hasDiscount ? (
                  <span className="mr-2 text-base font-semibold text-muted-foreground line-through">
                    ₩{pricing.listPriceKrw.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  </span>
                ) : null}
                ₩{pricing.salePriceKrw.toLocaleString(isKo ? "ko-KR" : "en-US")}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isKo ? "체험 기간 (PRO_TRIAL_DAYS)" : "Trial days"}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {pricing.trialDays}
                {isKo ? "일" : " days"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <MatrixTable
        title={isKo ? "기능 게이트 (FEATURE_MIN_LEVEL)" : "Feature gates (FEATURE_MIN_LEVEL)"}
        description={
          isKo
            ? "ReportFeature 전수 — entitlements/features.ts 자동 순회"
            : "All ReportFeature keys — auto-iterated from entitlements/features.ts"
        }
        sectionLabel={isKo ? "기능" : "Feature"}
        rows={matrix.featureRows}
        columns={columns}
        isKo={isKo}
        minLevelColumn
      />

      <MatrixTable
        title={isKo ? "수치 한도" : "Numeric limits"}
        description={
          isKo
            ? "constants.ts · plan-cart-limits.ts — 런타임과 동일 상수"
            : "constants.ts · plan-cart-limits.ts — same constants as runtime"
        }
        sectionLabel={isKo ? "한도" : "Limit"}
        rows={matrix.limitRows}
        columns={columns}
        isKo={isKo}
      />

      <p className="text-xs text-muted-foreground">
        {isKo ? "생성 시각" : "Generated"}:{" "}
        {new Date(matrix.generatedAt).toLocaleString(isKo ? "ko-KR" : "en-US")}{" "}
        · {isKo ? "열" : "Columns"}: {colLabels.join(" / ")}
      </p>
    </div>
  );
}
