/** AI seed / 예시 시나리오 성공 사례 — 실 집행·검증 데이터와 구분 */
export function isExampleSuccessCase(
  metricsJson: Record<string, unknown> | null | undefined,
): boolean {
  if (!metricsJson || typeof metricsJson !== "object") return false;
  return metricsJson.seed === true;
}
