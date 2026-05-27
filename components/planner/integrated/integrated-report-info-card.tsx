"use client";

type Props = { isKo: boolean };

export function IntegratedReportInfoCard({ isKo }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-base font-bold text-gray-900 dark:text-white">
        📊 {isKo ? "통합 미디어 플래너 보고서" : "Integrated media planner report"}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isKo ? "무료" : "Free"}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-white/80">
            <li>✓ {isKo ? "OOH 매체 기본 정보" : "OOH media basics"}</li>
            <li>✓ {isKo ? "디지털 예산 배분 추천" : "Digital budget split"}</li>
            <li>✓ {isKo ? "플랫폼별 기본 노출 예측" : "Per-platform reach estimates"}</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            PRO 🔒
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-600 dark:text-white/70">
            <li>🔒 {isKo ? "OOH × 디지털 시너지 분석" : "OOH × digital synergy"}</li>
            <li>🔒 {isKo ? "통합 CPM 비교" : "Blended CPM comparison"}</li>
            <li>🔒 {isKo ? "ROI 및 브랜드 리프트 예측" : "ROI & brand lift"}</li>
            <li>🔒 {isKo ? "AI 최적화 제안" : "AI optimization tips"}</li>
            <li>🔒 {isKo ? "PDF 다운로드" : "PDF download"}</li>
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-violet-600 dark:text-violet-400">
        {isKo
          ? "PRO 업그레이드 시 대행사 PT·비딩 자료로 즉시 활용 가능"
          : "Upgrade to PRO for agency-ready pitch & bidding decks"}
      </p>
    </div>
  );
}
