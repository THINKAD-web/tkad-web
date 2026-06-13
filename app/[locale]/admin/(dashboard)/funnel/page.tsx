import { getAdvertiserFunnelStats } from "@/lib/funnel-analytics";
import { AdminFunnelDashboard } from "@/components/admin/admin-funnel-dashboard";
import { AdminConversionFunnel } from "@/components/admin/admin-conversion-funnel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminFunnelPage({ params }: Props) {
  await params;
  const stats = await getAdvertiserFunnelStats(30);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">전환 퍼널 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          방문 → 매체 → 플랜 → 견적 → 문의 여정과 단계별 전환율
        </p>
      </div>

      <AdminConversionFunnel />

      <div className="pt-2">
        <h2 className="text-lg font-bold tracking-tight">광고주 여정 (상세)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          첫 방문(UTM·referrer) → 예산 미리보기 → 빠른 견적 · 가이드 · 가입 · 견적 요청 (최근 30일)
        </p>
      </div>
      <AdminFunnelDashboard stats={stats} />
    </div>
  );
}
