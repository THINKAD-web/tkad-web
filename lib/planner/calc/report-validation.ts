/**
 * `runValidation` 결과 처리 (A-1 Wave 4).
 *
 * **프로덕션에서 절대 throw 하지 않는다.** 자기 검증 때문에 사용자 보고서가
 * 안 뜨면 본말전도다. 실패는 Sentry 로 보내고 보고서는 그대로 렌더한다.
 *
 *   테스트   `runValidation` 을 직접 호출해 assert (여기 거치지 않음)
 *   개발     console.warn 으로 issue 출력
 *   프로덕션 captureSentryException — DSN 미설정 시 무해한 no-op
 *
 * 로그만 보고 바로 원인을 추적할 수 있어야 하므로 컨텍스트를 함께 싣는다.
 *   planId · engineVersion · 실패한 검사 id · 기대/실제/차이 · 매체 id
 *   집계 커버리지 (미매핑 규모)
 */

import { captureSentryException } from "@/lib/sentry";
import { runValidation } from "@/lib/planner/calc/validate";
import type { PlanResult } from "@/lib/planner/calc/types";

export type PlanValidationSurface =
  | "report_payload_ooh"
  | "report_payload_integrated"
  | "plan_cart_report";

/** Sentry 이벤트 제목 — 검색·그룹핑 기준 */
class PlanValidationError extends Error {
  constructor(surface: PlanValidationSurface, checks: string[]) {
    super(`PlanResult validation failed (${surface}): ${checks.join(", ")}`);
    this.name = "PlanValidationError";
  }
}

/**
 * 계산 결과를 검증하고 실패 시에만 보고한다.
 * 반환값 없음 — 호출자는 결과에 관계없이 하던 일을 계속한다.
 */
export function reportPlanValidation(
  plan: PlanResult,
  surface: PlanValidationSurface,
): void {
  let report: ReturnType<typeof runValidation>;
  try {
    report = runValidation(plan);
  } catch {
    // 검증기 자체가 터져도 보고서는 나가야 한다.
    return;
  }

  if (report.ok) return;

  // 커버리지 부족은 엔진 버그가 아니라 데이터 미매핑이라 ok 를 내리지 않는다.
  // 여기 도달했다는 건 그 외 검사가 실패했다는 뜻이다.
  const failing = report.issues.filter((i) => i.check !== "BREAKDOWN_COVERAGE");
  if (failing.length === 0) return;

  const checks = [...new Set(failing.map((i) => i.check))];

  const extra: Record<string, unknown> = {
    surface,
    planId: plan.meta.planId,
    engineVersion: plan.meta.engineVersion,
    calculatedAt: plan.meta.calculatedAt,
    mediaCount: plan.meta.mediaCount,
    periodDays: plan.period.days,
    failedChecks: checks,
    issues: failing.map((i) => ({
      check: i.check,
      message: i.message,
      expected: i.expected,
      actual: i.actual,
      delta: i.delta,
      mediaId: i.mediaId,
    })),
    // 미매핑 규모 — A-4 우선순위 판단 자료
    coverage: report.coverage,
  };

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[PlanResult] validation failed on ${surface}: ${checks.join(", ")}`,
      extra,
    );
    return;
  }

  void captureSentryException(new PlanValidationError(surface, checks), extra);
}
