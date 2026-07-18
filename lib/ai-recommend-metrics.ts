/**
 * 호환 thin wrapper — 계산 SSOT는 `lib/media-metrics.ts`.
 * 기존 import 경로를 깨지 않기 위해 유지한다.
 */
export type { MediaMetricsInput as DisplayCpmInput } from "@/lib/media-metrics";
export {
  resolveMonthlyImpressions as estimatedMonthlyImpressions,
  estimateCatalogCpmWon as estimatedCpmWon,
  resolveDisplayCpmWon,
  resolveCpmWon,
  formatMonthlyImpressionsLabel,
} from "@/lib/media-metrics";
