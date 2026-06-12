import { AdminTrustMetricsClient } from "@/components/admin/admin-trust-metrics-client";

export const dynamic = "force-dynamic";

export default function AdminTrustMetricsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black">신뢰 지표</h1>
        <p className="text-sm text-muted-foreground">
          홈·푸터·매체 페이지에 노출되는 검증 매체·누적 캠페인·활성 브랜드 수.
          비워두면 DB 자동 집계값을 사용합니다.
        </p>
      </div>
      <AdminTrustMetricsClient />
    </div>
  );
}
